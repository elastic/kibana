/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { asyncForEach } from '@kbn/std';

import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionList,
  deleteExceptionListItem,
} from '@kbn/lists-plugin/server/services/exception_lists';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { DETECTION_TYPE, NAMESPACE_TYPE } from '@kbn/lists-plugin/common/constants.mock';
import { TelemetryEventsSender } from '../../lib/telemetry/sender';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import type { SecurityTelemetryTask } from '../../lib/telemetry/task';
import { Plugin as SecuritySolutionPlugin } from '../../plugin';
import { AsyncTelemetryEventsSender } from '../../lib/telemetry/async_sender';

export function getTelemetryTasks(
  spy: jest.SpyInstance<
    SecuritySolutionPluginStart,
    [core: CoreStart, plugins: SecuritySolutionPluginStartDependencies]
  >
): SecurityTelemetryTask[] {
  const pluginInstances = spy.mock.instances;
  if (pluginInstances.length === 0) {
    throw new Error('Telemetry sender not started');
  }
  const plugin = pluginInstances[0];
  if (plugin instanceof SecuritySolutionPlugin) {
    /* eslint dot-notation: "off" */
    const sender = plugin['telemetryEventsSender'];
    if (sender instanceof TelemetryEventsSender) {
      /* eslint dot-notation: "off" */
      return sender['telemetryTasks'] ?? [];
    } else {
      throw new Error('Telemetry sender not started');
    }
  } else {
    throw new Error('Telemetry sender not started');
  }
}

export function getAsyncTelemetryEventSender(
  spy: jest.SpyInstance<
    SecuritySolutionPluginStart,
    [core: CoreStart, plugins: SecuritySolutionPluginStartDependencies]
  >
): AsyncTelemetryEventsSender {
  const pluginInstances = spy.mock.instances;
  if (pluginInstances.length === 0) {
    throw new Error('Telemetry sender not started');
  }
  const plugin = pluginInstances[0];
  if (plugin instanceof SecuritySolutionPlugin) {
    /* eslint dot-notation: "off" */
    const sender = plugin['asyncTelemetryEventsSender'];
    if (sender instanceof AsyncTelemetryEventsSender) {
      return sender;
    } else {
      throw new Error('Telemetry sender not started');
    }
  } else {
    throw new Error('Telemetry sender not started');
  }
}

export function getTelemetryTask(
  tasks: SecurityTelemetryTask[],
  id: string
): SecurityTelemetryTask {
  const task = tasks.find((t) => t['config'].type === id);

  expect(task).toBeDefined();
  if (task === undefined) {
    throw new Error(`Task ${id} not found`);
  }
  return task;
}

export async function createMockedAlert(
  esClient: ElasticsearchClient,
  so: SavedObjectsServiceStart
) {
  const alertIndex = so.getIndexForType('alert');
  const aliasInfo = await esClient.indices.getAlias({ index: alertIndex });
  const alias = Object.keys(aliasInfo);

  await esClient.create({
    index: alias[0],
    id: 'test-id',
    body: mockedRule,
    refresh: 'wait_for',
  });
}

export async function cleanupMockedAlerts(
  esClient: ElasticsearchClient,
  so: SavedObjectsServiceStart
) {
  const alertIndex = so.getIndexForType('alert');
  const aliasInfo = await esClient.indices.getAlias({ index: alertIndex });
  const alias = Object.keys(aliasInfo);

  await esClient
    .deleteByQuery({
      index: alias[0],
      body: {
        query: {
          match_all: {},
        },
      },
    })
    .catch(() => {
      // ignore errors
    });
}

export async function createMockedExceptionList(so: SavedObjectsServiceStart) {
  const type = DETECTION_TYPE;
  const listId = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;

  const immutable = true;
  const savedObjectsClient = so.getScopedClient(fakeKibanaRequest);

  const namespaceType = NAMESPACE_TYPE;
  const name = 'test';
  const description = 'test';
  const meta = undefined;
  const user = '';
  const version = 1;
  const tags: string[] = [];
  const tieBreaker = '';

  const exceptionList = await createExceptionList({
    listId,
    immutable,
    savedObjectsClient,
    namespaceType,
    name,
    description,
    meta,
    user,
    tags,
    tieBreaker,
    type,
    version,
  });

  const exceptionListItem = await createExceptionListItem({
    comments: [],
    entries: [
      {
        field: 'process.hash.md5',
        operator: 'included',
        type: 'match',
        value: 'ae27a4b4821b13cad2a17a75d219853e',
      },
    ],
    expireTime: undefined,
    itemId: '1',
    listId,
    savedObjectsClient,
    namespaceType,
    name: 'item1',
    osTypes: ['linux'],
    description,
    meta,
    user,
    tags,
    tieBreaker,
    type: 'simple',
  });

  return { exceptionList, exceptionListItem };
}

export async function cleanupMockedExceptionLists(
  exceptionsList: ExceptionListSchema[],
  exceptionsListItem: ExceptionListItemSchema[],
  so: SavedObjectsServiceStart
) {
  const savedObjectsClient = so.getScopedClient(fakeKibanaRequest);
  await asyncForEach(exceptionsListItem, async (exceptionListItem) => {
    await deleteExceptionListItem({
      itemId: exceptionListItem.item_id,
      id: exceptionListItem.id,
      namespaceType: NAMESPACE_TYPE,
      savedObjectsClient,
    });
  });
  await asyncForEach(exceptionsList, async (exceptionList) => {
    await deleteExceptionList({
      listId: exceptionList.list_id,
      id: exceptionList.id,
      namespaceType: NAMESPACE_TYPE,
      savedObjectsClient,
    });
  });
}

const mockedRule = {
  alert: {
    name: 'Azure Automation Runbook Created or Modified',
    tags: ['Elastic', 'Cloud', 'Azure', 'Continuous Monitoring', 'SecOps', 'Configuration Audit'],
    alertTypeId: 'siem.queryRule',
    consumer: 'siem',
    params: {
      author: ['Elastic'],
      description: 'test',
      ruleId: 'id-test',
      falsePositives: [],
      from: 'now-25m',
      immutable: true,
      license: 'Elastic License v2',
      outputIndex: '.siem-signals-default',
      maxSignals: 100,
      relatedIntegrations: [
        {
          integration: 'activitylogs',
          package: 'azure',
          version: '^1.0.0',
        },
      ],
      requiredFields: [
        {
          ecs: false,
          name: 'azure.activitylogs.operation_name',
          type: 'keyword',
        },
        {
          ecs: true,
          name: 'event.dataset',
          type: 'keyword',
        },
        {
          ecs: true,
          name: 'event.outcome',
          type: 'keyword',
        },
      ],
      riskScore: 21,
      riskScoreMapping: [],
      setup:
        'The Azure Fleet integration, Filebeat module, or similarly structured data is required to be compatible with this rule.',
      severity: 'low',
      severityMapping: [],
      threat: [],
      timestampOverride: 'event.ingested',
      to: 'now',
      references: [
        'https://powerzure.readthedocs.io/en/latest/Functions/operational.html#create-backdoor',
        'https://github.com/hausec/PowerZure',
        'https://posts.specterops.io/attacking-azure-azure-ad-and-introducing-powerzure-ca70b330511a',
        'https://azure.microsoft.com/en-in/blog/azure-automation-runbook-management/',
      ],
      note: '',
      version: 101,
      exceptionsList: [
        {
          type: 'detection',
          id: '123456',
          list_id: 'endpoint_trusted_apps',
          namespace_type: 'single',
        },
      ],
      type: 'query',
      language: 'kuery',
      index: ['filebeat-*', 'logs-azure*'],
      query: '',
    },
    schedule: {
      interval: '5m',
    },
    enabled: false,
    actions: [],
    throttle: null,
    notifyWhen: 'onActiveAlert',
    apiKeyOwner: null,
    apiKey: null,
    createdBy: 'a@b.co',
    updatedBy: 'a@b.co',
    createdAt: '2021-11-25T15:44:44.682Z',
    updatedAt: '2023-01-04T14:20:54.727Z',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'pending',
      lastExecutionDate: '2021-11-25T15:44:44.682Z',
      error: null,
    },
    meta: {
      versionApiKeyLastmodified: '8.5.0',
    },
    legacyId: '123456',
    mapped_params: {
      risk_score: 21,
      severity: '20-low',
    },
    snoozeSchedule: [],
    monitoring: {
      run: {
        history: [],
        calculated_metrics: {
          success_ratio: 0,
        },
        last_run: {
          timestamp: '2021-11-25T15:44:44.682Z',
          metrics: {
            total_search_duration_ms: null,
            total_indexing_duration_ms: null,
            total_alerts_detected: null,
            total_alerts_created: null,
            gap_duration_s: null,
            duration: 2212,
          },
        },
      },
    },
    revision: 101,
  },
  type: 'alert',
  references: [],
  managed: false,
  namespaces: ['default'],
  coreMigrationVersion: '8.8.0',
  typeMigrationVersion: '8.8.0',
  updated_at: '2023-01-04T14:20:54.727Z',
};

const fakeKibanaRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

export function getTelemetryTaskTitle(task: SecurityTelemetryTask): string {
  if (task !== null && typeof task === 'object') {
    return task['config']['title'];
  } else {
    return '';
  }
}
