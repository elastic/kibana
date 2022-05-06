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
import get from 'lodash/get';

import partition from 'lodash/partition';

import type { Agent, FullAgentPolicy, PackageInfo } from '../../types';

import { getAgentById } from '../agents';
import { getFullAgentPolicy } from '../agent_policies';
import { getPackageInfo } from '../epm/packages';

import { packagePolicyService } from '../package_policy';
import { incrementPackageName } from '../package_policies';

import { generatePackagePolicy } from './generate_package_policy';

import type { Hint, ParsedAnnotations } from './types';
import { setHintsAsReceived, setHintsAsComplete, getNewHints } from './crud';
const FLEET_POLL_HINTS_INDEX_TASK_ID = 'FLEET:sync-task';
const FLEET_POLL_HINTS_INDEX_TASK_TYPE = 'FLEET:poll-hints-index';
const POLL_INTERVAL = '5s';
const POLICY_NAME_PREFIX = 'autodiscover-';
const ANNOTATION_PREFIX = 'elastic-co-hints/';
const VALID_HINTS = Object.freeze(['host', 'package']);
const SUPPORTED_PACKAGES = ['nginx', 'redis', 'apache'];
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

const hintHasAutodiscoverAnnotations = (hint: Hint) => {
  return Object.keys(hint?.kubernetes?.annotations || {}).some((key) =>
    key.startsWith(ANNOTATION_PREFIX)
  );
};

const parseAnnotations = (hint: Hint): ParsedAnnotations => {
  const result = {} as ParsedAnnotations;
  const annotations = hint?.kubernetes?.annotations || {};
  Object.entries(annotations).map(([key, val]) => {
    if (!key.startsWith(ANNOTATION_PREFIX)) return;

    const parsedKey = key.slice(ANNOTATION_PREFIX.length);

    if (VALID_HINTS.includes(parsedKey)) {
      // @ts-ignore
      result[parsedKey] = templateVal(val, hint);
    }
  });

  return result;
};

const VALID_TEMPLATE_VARS = ['kubernetes.pod.ip'];
const toTemplateStr = (s: string) => '${' + s + '}';
const getTemplateVarsRegex = /(?<=\$\{).*?(?=\})/gm;
export const templateVal = (val: string, hint: Hint): string => {
  const templateVars = val.match(getTemplateVarsRegex);

  if (!templateVars) return val;

  const validTemplateVars = new Set(templateVars.filter((v) => VALID_TEMPLATE_VARS.includes(v)));

  if (!validTemplateVars.size) return val;

  let templatedVar = val;

  validTemplateVars.forEach((templateVar) => {
    templatedVar = templatedVar.replaceAll(toTemplateStr(templateVar), get(hint, templateVar));
  });

  return templatedVar;
};

const getAgentForHint = async (
  esClient: ElasticsearchClient,
  hint: Hint,
  logger?: Logger
): Promise<Agent | null> => {
  let agent: Agent | null = null;
  try {
    agent = await getAgentById(esClient, hint.agent_id);
  } catch (e) {
    logger?.error(e);
  }

  return agent;
};
const getPolicyForAgent = async (
  soClient: SavedObjectsClientContract,
  agent: Agent,
  logger?: Logger
): Promise<FullAgentPolicy | null> => {
  let policy: FullAgentPolicy | null = null;
  if (!agent.policy_id) return policy;
  try {
    policy = await getFullAgentPolicy(soClient, agent.policy_id);
  } catch (e) {
    logger?.error(e);
  }

  return policy;
};

const getPackage = async (
  soClient: SavedObjectsClientContract,
  pkgName: string,
  logger?: Logger
): Promise<PackageInfo | null> => {
  let packageInfo: PackageInfo | null = null;
  try {
    packageInfo = await getPackageInfo({ savedObjectsClient: soClient, pkgName, pkgVersion: '' });
  } catch (e) {
    logger?.info(`Error getting package ${pkgName}: ${e}`);
  }

  return packageInfo;
};

const processHints = async (params: HintTaskDeps & { logger?: Logger }) => {
  const { esClient, soClient, logger } = params;
  const hints = await getNewHints(esClient);
  if (!hints.length) return;

  await setHintsAsReceived(esClient, hints, logger);

  const [annotatedHints, emptyHints] = partition(hints, hintHasAutodiscoverAnnotations);

  if (emptyHints.length) {
    await setHintsAsComplete(esClient, emptyHints);
  }

  if (!annotatedHints.length) return;

  const results = await Promise.all(
    annotatedHints.map(async (hint) => {
      const parsedAnnotations = parseAnnotations(hint);

      if (!parsedAnnotations.package) {
        logger?.info(`No package annotation found for hint ${hint._id}`);
        return;
      }

      if (!SUPPORTED_PACKAGES.includes(parsedAnnotations.package)) {
        logger?.info(`Hint ${hint._id} package ${parsedAnnotations.package} not yet supported`);
        return;
      }

      const agent = await getAgentForHint(esClient, hint, logger);

      if (!agent) {
        logger?.info(`No agent found for ${hint.agent_id}`);
        return;
      }

      const agentPolicy = await getPolicyForAgent(soClient, agent, logger);

      if (!agentPolicy) {
        logger?.info(`No agent policy found for agent ${hint.agent_id} policy ${agent.policy_id}`);
        return;
      }

      const packageInfo = await getPackage(soClient, parsedAnnotations.package);

      if (!packageInfo) {
        logger?.info(`No package found ${parsedAnnotations.package}`);
        return;
      }

      const name = await incrementPackageName(soClient, packageInfo.name, POLICY_NAME_PREFIX);
      const packagePolicy = generatePackagePolicy(
        name,
        agent,
        agentPolicy,
        packageInfo,
        parsedAnnotations,
        logger
      );

      if (!packagePolicy) {
        logger?.info(`Unable to generate package policy ${parsedAnnotations.package}`);
        return;
      }

      const createdPolicy = await packagePolicyService.create(soClient, esClient, packagePolicy);
      logger?.info(`Finished processing ${hint._id}`);

      return createdPolicy;
    })
  );

  setHintsAsComplete(esClient, annotatedHints, results);
};
