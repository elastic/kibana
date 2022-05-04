/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  TaskManagerStartContract,
  TaskInstance,
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import partition from 'lodash/partition';
const FLEET_POLL_HINTS_INDEX_TASK_ID = 'FLEET:sync-task';
const FLEET_POLL_HINTS_INDEX_TASK_TYPE = 'FLEET:poll-hints-index';
const POLL_INTERVAL = '5s';
const ANNOTATION_PREFIX = 'elastic.co.hints/';
const VALID_HINTS = Object.freeze(['host', 'package']);

type HintStatus = 'complete' | 'error';
interface Hint {
  _id: string;
  agent_id: string;
  fleet?: {
    received_at?: number;
    status?: HintStatus;
    installed_package?: string;
  };
  container: {
    id: string;
    image: {
      name: string;
    };
    runtime: string;
  };
  orchestrator: {
    cluster: {
      name: string;
      url: string;
    };
  };
  kubernetes: {
    namespace: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    pod: {
      ip: string;
      name: string;
      uid: string;
    };
  };
}

interface HintTaskDeps {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}
export const registerHintsTask = (
  taskManager: TaskManagerSetupContract,
  getTaskDeps: () => Promise<HintTaskDeps>,
  logger?: Logger
) => {
  taskManager.registerTaskDefinitions({
    [FLEET_POLL_HINTS_INDEX_TASK_TYPE]: {
      title: 'Fleet - Poll Hints Index',
      description: 'This task polls the fleet hints index for new hints.',
      timeout: '2m',
      maxAttempts: 1,
      maxConcurrency: 1,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          async run() {
            const { state } = taskInstance;
            const deps = await getTaskDeps();

            await processHints({ ...deps, logger });
            return { state };
          },
          async cancel() {
            logger?.warn(`Task ${FLEET_POLL_HINTS_INDEX_TASK_ID} timed out`);
          },
        };
      },
    },
  });
};

export const scheduleHintsTask = async (
  taskManager: TaskManagerStartContract,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<TaskInstance | null> => {
  try {
    await taskManager.removeIfExists(FLEET_POLL_HINTS_INDEX_TASK_ID);
    const taskInstance = await taskManager.ensureScheduled({
      id: FLEET_POLL_HINTS_INDEX_TASK_ID,
      taskType: FLEET_POLL_HINTS_INDEX_TASK_TYPE,
      schedule: {
        interval: POLL_INTERVAL,
      },
      params: {},
      state: {},
      scope: ['fleet'],
    });

    logger?.info(
      `Task ${FLEET_POLL_HINTS_INDEX_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
    );

    return taskInstance;
  } catch (e) {
    logger?.error(`Error running task: ${FLEET_POLL_HINTS_INDEX_TASK_ID}, `, e?.message() ?? e);

    return null;
  }
};

const getNewHints = async (esClient: ElasticsearchClient): Promise<Hint[]> => {
  const { hits } = await esClient.search({
    index: '.fleet-hints',
    query: {
      bool: {
        must_not: [
          {
            exists: {
              field: 'fleet.received_at',
            },
          },
        ],
      },
    },
  });

  if (!hits?.hits.length) return [];

  const hints = hits.hits.map(
    ({ _id, _source }) =>
      ({
        _id,
        ...(_source as Record<string, unknown>),
      } as Hint)
  );

  return hints;
};

const updateSingleDoc = async (esClient: ElasticsearchClient, id: string, update: any) => {
  esClient.update({
    index: '.fleet-hints',
    id,
    body: {
      doc: {
        ...update,
      },
    },
    refresh: 'wait_for',
    retry_on_conflict: 3,
  });
};

const updateHintsById = async (esClient: ElasticsearchClient, hints: Hint[], update: any) => {
  const ids = hints.map((h) => h._id);
  try {
    await Promise.all(ids.map((id) => updateSingleDoc(esClient, id, update)));
  } catch (e) {
    console.log('CAUGHR UPDATE ERROR ' + JSON.stringify(e));
    throw e;
  }
};
const setHintsAsReceived = (esClient: ElasticsearchClient, hints: Hint[]) => {
  // const updateScript = `ctx._source['fleet'] = [ 'received_at' : ${Date.now()}L ]`;
  const update = { fleet: { received_at: Date.now() } };
  return updateHintsById(esClient, hints, update);
};

const setHintsAsComplete = (esClient: ElasticsearchClient, hints: Hint[]) => {
  // const updateScript = `ctx._source.fleet.status = 'complete'`;
  const update = { fleet: { status: 'complete' } };
  console.log('UPDATE SCRIPT = ' + JSON.stringify(update));
  return updateHintsById(esClient, hints, update);
};

const hintHasAutodiscoverAnnotations = (hint: Hint) => {
  return Object.keys(hint.kubernetes?.annotations || {}).some((key) =>
    key.startsWith(ANNOTATION_PREFIX)
  );
};

const processHints = async (params: HintTaskDeps & { logger?: Logger }) => {
  const { esClient, soClient, logger } = params;
  const hints = await getNewHints(esClient);
  if (!hints.length) return;

  await setHintsAsReceived(esClient, hints);

  const [annotatedHints, emptyHints] = partition(hints, hintHasAutodiscoverAnnotations);

  if (emptyHints.length) {
    await setHintsAsComplete(esClient, emptyHints);
  }

  if (!annotatedHints.length) return;

  console.log('FOUND INTERESTING HINTS ', JSON.stringify(annotatedHints));
};
