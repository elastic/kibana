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
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';

import { packagePolicyService } from '@kbn/fleet-plugin/server/services';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { DETECTION_TYPE, NAMESPACE_TYPE } from '@kbn/lists-plugin/common/constants.mock';
import { bulkInsert, updateTimestamps } from './helpers';
import { TelemetryEventsSender } from '../../lib/telemetry/sender';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import type { SecurityTelemetryTask } from '../../lib/telemetry/task';
import { Plugin as SecuritySolutionPlugin } from '../../plugin';
import { AsyncTelemetryEventsSender } from '../../lib/telemetry/async_sender';
import { type ITelemetryReceiver, TelemetryReceiver } from '../../lib/telemetry/receiver';
import { DEFAULT_DIAGNOSTIC_INDEX } from '../../lib/telemetry/constants';
import mockEndpointAlert from '../__mocks__/endpoint-alert.json';
import mockedRule from '../__mocks__/rule.json';
import fleetAgents from '../__mocks__/fleet-agents.json';
import endpointMetrics from '../__mocks__/endpoint-metrics.json';
import prebuiltRulesEvents from '../__mocks__/prebuilt-rules-events.json';
import endpointMetadata from '../__mocks__/endpoint-metadata.json';
import endpointPolicy from '../__mocks__/endpoint-policy.json';

const fleetIndex = '.fleet-agents';
const endpointMetricsIndex = '.ds-metrics-endpoint.metrics-1';
const endpointMetricsMetadataIndex = '.ds-metrics-endpoint.metadata-1';
const endpointMetricsPolicyIndex = '.ds-metrics-endpoint.policy-1';
const prebuiltRulesIndex = '.alerts-security.alerts';

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

export function getTelemetryReceiver(
  spy: jest.SpyInstance<
    SecuritySolutionPluginStart,
    [core: CoreStart, plugins: SecuritySolutionPluginStartDependencies]
  >
): ITelemetryReceiver {
  const pluginInstances = spy.mock.instances;
  if (pluginInstances.length === 0) {
    throw new Error('security_solution plugin not started');
  }
  const plugin = pluginInstances[0];
  if (plugin instanceof SecuritySolutionPlugin) {
    /* eslint dot-notation: "off" */
    const receiver = plugin['telemetryReceiver'];
    if (receiver instanceof TelemetryReceiver) {
      return receiver;
    } else {
      throw new Error('security_solution plugin not started');
    }
  } else {
    throw new Error('security_solution plugin not started');
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

export async function createMockedEndpointAlert(esClient: ElasticsearchClient) {
  const index = `${DEFAULT_DIAGNOSTIC_INDEX.replace('-*', '')}-001`;

  await esClient.indices.create({ index, body: { settings: { hidden: true } } });

  if (mockEndpointAlert['event']) {
    mockEndpointAlert['event']['ingested'] = new Date().toISOString();
  }

  await esClient.create({
    index,
    id: 'diagnostic-test-id',
    body: mockEndpointAlert,
    refresh: 'wait_for',
  });
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

export async function mockEndpointData(
  esClient: ElasticsearchClient,
  so: SavedObjectsServiceStart
) {
  await createAgentPolicy('policy-elastic-agent-on-cloud', esClient, so);
  await bulkInsert(esClient, fleetIndex, fleetAgents, ['123', '456']);
  await bulkInsert(esClient, endpointMetricsIndex, updateTimestamps(endpointMetrics));
  await bulkInsert(esClient, endpointMetricsMetadataIndex, updateTimestamps(endpointMetadata));
  await bulkInsert(esClient, endpointMetricsPolicyIndex, updateTimestamps(endpointPolicy));
}

export async function mockPrebuiltRulesData(esClient: ElasticsearchClient) {
  await bulkInsert(esClient, prebuiltRulesIndex, updateTimestamps(prebuiltRulesEvents));
}

export async function initEndpointIndices(esClient: ElasticsearchClient) {
  const mappings: object = {
    dynamic: false,
    properties: {
      '@timestamp': {
        type: 'date',
      },
      agent: {
        properties: {
          id: {
            type: 'keyword',
          },
        },
      },
    },
  };

  await esClient.indices.create({ index: endpointMetricsIndex, mappings }).catch(() => {});
  await esClient.indices.create({ index: endpointMetricsPolicyIndex, mappings }).catch(() => {});
  await esClient.indices.create({ index: endpointMetricsMetadataIndex, mappings }).catch(() => {});
}

export async function dropEndpointIndices(esClient: ElasticsearchClient) {
  await esClient.indices.delete({ index: endpointMetricsIndex }).catch(() => {});
  await esClient.indices.delete({ index: endpointMetricsMetadataIndex }).catch(() => {});
  await esClient.indices.delete({ index: endpointMetricsPolicyIndex }).catch(() => {});
}

export async function cleanupMockedEndpointAlerts(esClient: ElasticsearchClient) {
  const index = `${DEFAULT_DIAGNOSTIC_INDEX.replace('-*', '')}-001`;

  await esClient.indices.delete({ index }).catch(() => {
    // ignore errors
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

export async function createAgentPolicy(
  id: string,
  esClient: ElasticsearchClient,
  so: SavedObjectsServiceStart
) {
  const soClient = so.getScopedClient(fakeKibanaRequest);
  const packagePolicy = {
    name: 'Endpoint Policy 1',
    description: 'Endpoint policy 1',
    namespace: 'default',
    enabled: true,
    policy_id: 'policy-elastic-agent-on-cloud',
    policy_ids: ['policy-elastic-agent-on-cloud'],
    package: { name: 'endpoint', title: 'Elastic Endpoint', version: '8.11.1' },
    inputs: [
      {
        config: {
          policy: {
            value: {
              linux: {
                advanced: {
                  agent: {
                    connection_delay: 60,
                  },
                },
              },
            },
          },
        },
        enabled: true,
        type: 'endpoint',
        streams: [],
      },
    ],
  };

  await soClient.create<unknown>(LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, {}, { id }).catch(() => {});
  await packagePolicyService
    .create(soClient, esClient, packagePolicy, {
      id,
      spaceId: 'default',
      bumpRevision: false,
    })
    .catch(() => {});
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

export function getTelemetryTaskType(task: SecurityTelemetryTask): string {
  if (task !== null && typeof task === 'object') {
    return task['config']['type'];
  } else {
    return '';
  }
}
