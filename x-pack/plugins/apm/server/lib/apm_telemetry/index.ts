/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CoreSetup, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { APMConfig } from '../..';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import {
  APM_TELEMETRY_SAVED_OBJECT_ID,
  APM_TELEMETRY_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import {
  collectDataTelemetry,
  CollectTelemetryParams,
} from './collect_data_telemetry';
import { APMTelemetry } from './types';

const APM_TELEMETRY_TASK_NAME = 'apm-telemetry-task';

export async function createApmTelemetry({
  core,
  config$,
  usageCollector,
  taskManager,
  logger,
}: {
  core: CoreSetup;
  config$: Observable<APMConfig>;
  usageCollector: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}) {
  taskManager.registerTaskDefinitions({
    [APM_TELEMETRY_TASK_NAME]: {
      title: 'Collect APM telemetry',
      type: APM_TELEMETRY_TASK_NAME,
      createTaskRunner: () => {
        return {
          run: async () => {
            await collectAndStore();
          },
          cancel: async () => {},
        };
      },
    },
  });

  const savedObjectsClient = await getInternalSavedObjectsClient(core);

  const collectAndStore = async () => {
    const config = await config$.pipe(take(1)).toPromise();
    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.legacy.client;

    const indices = await getApmIndices({
      config,
      savedObjectsClient,
    });

    const search = esClient.callAsInternalUser.bind(
      esClient,
      'search'
    ) as CollectTelemetryParams['search'];

    const indicesStats = esClient.callAsInternalUser.bind(
      esClient,
      'indices.stats'
    ) as CollectTelemetryParams['indicesStats'];

    const transportRequest = esClient.callAsInternalUser.bind(
      esClient,
      'transport.request'
    ) as CollectTelemetryParams['transportRequest'];

    const dataTelemetry = await collectDataTelemetry({
      search,
      indices,
      logger,
      indicesStats,
      transportRequest,
    });

    await savedObjectsClient.create(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      dataTelemetry,
      { id: APM_TELEMETRY_SAVED_OBJECT_TYPE, overwrite: true }
    );
  };

  const collector = usageCollector.makeUsageCollector({
    type: 'apm',
    schema: {
      agents: {
        dotnet: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        go: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        java: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        'js-base': {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        nodejs: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        python: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        ruby: {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
        'rum-js': {
          agent: {
            version: { type: 'keyword' },
          },
          service: {
            framework: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            language: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
            runtime: {
              composite: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
      },
      cloud: {
        availability_zone: { type: 'keyword' },
        provider: { type: 'keyword' },
        region: { type: 'keyword' },
      },
      counts: {
        agent_configuration: {
          all: { type: 'long' },
        },
        error: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
        max_error_groups_per_service: {
          '1d': { type: 'long' },
        },
        max_transaction_groups_per_service: {
          '1d': { type: 'long' },
        },
        metric: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
        onboarding: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
        services: {
          '1d': { type: 'long' },
        },
        sourcemap: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
        span: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
        traces: {
          '1d': { type: 'long' },
        },
        transaction: {
          '1d': { type: 'long' },
          all: { type: 'long' },
        },
      },
      cardinality: {
        user_agent: {
          original: {
            all_agents: {
              '1d': { type: 'long' },
            },
            rum: {
              '1d': { type: 'long' },
            },
          },
        },
        transaction: {
          name: {
            all_agents: {
              '1d': { type: 'long' },
            },
            rum: {
              '1d': { type: 'long' },
            },
          },
        },
      },
      has_any_services: {
        type: 'boolean',
      },
      indices: {
        all: {
          total: {
            docs: { count: { type: 'long' } },
            store: { size_in_bytes: { type: 'long' } },
          },
        },
        shards: { total: { type: 'long' } },
      },
      integrations: {
        ml: { all_jobs_count: { type: 'long' } },
      },
      retainment: {
        error: { ms: { type: 'long' } },
        metric: { ms: { type: 'long' } },
        onboarding: { ms: { type: 'long' } },
        span: { ms: { type: 'long' } },
        transaction: { ms: { type: 'long' } },
      },
      services_per_agent: {
        dotnet: { type: 'long' },
        go: { type: 'long' },
        java: { type: 'long' },
        'js-base': { type: 'long' },
        nodejs: { type: 'long' },
        python: { type: 'long' },
        ruby: { type: 'long' },
        'rum-js': { type: 'long' },
      },
      tasks: {
        agent_configuration: { took: { ms: { type: 'long' } } },
        agents: { took: { ms: { type: 'long' } } },
        cardinality: { took: { ms: { type: 'long' } } },
        cloud: { took: { ms: { type: 'long' } } },
        groupings: { took: { ms: { type: 'long' } } },
        indices_stats: { took: { ms: { type: 'long' } } },
        integrations: { took: { ms: { type: 'long' } } },
        processor_events: { took: { ms: { type: 'long' } } },
        services: { took: { ms: { type: 'long' } } },
        versions: { took: { ms: { type: 'long' } } },
      },
      version: {
        apm_server: {
          major: { type: 'long' },
          minor: { type: 'long' },
          patch: { type: 'long' },
        },
      },
    },
    fetch: async () => {
      try {
        const data = (
          await savedObjectsClient.get(
            APM_TELEMETRY_SAVED_OBJECT_TYPE,
            APM_TELEMETRY_SAVED_OBJECT_ID
          )
        ).attributes;

        return data as APMTelemetry;
      } catch (err) {
        if (err.output?.statusCode === 404) {
          // task has not run yet, so no saved object to return
          return {};
        }
        throw err;
      }
    },
    isReady: () => true,
  });

  usageCollector.registerCollector(collector);

  core.getStartServices().then(([_coreStart, pluginsStart]) => {
    const { taskManager: taskManagerStart } = pluginsStart as {
      taskManager: TaskManagerStartContract;
    };

    taskManagerStart.ensureScheduled({
      id: APM_TELEMETRY_TASK_NAME,
      taskType: APM_TELEMETRY_TASK_NAME,
      schedule: {
        interval: '720m',
      },
      scope: ['apm'],
      params: {},
      state: {},
    });
  });
}
