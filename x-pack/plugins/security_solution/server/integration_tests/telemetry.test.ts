/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios, { type AxiosRequestConfig } from 'axios';

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { ENDPOINT_STAGING } from '@kbn/telemetry-plugin/common/constants';
import {
  TELEMETRY_CHANNEL_DETECTION_ALERTS,
  TELEMETRY_CHANNEL_ENDPOINT_META,
} from '../lib/telemetry/constants';

import { eventually, setupTestServers, removeFile } from './lib/helpers';
import {
  cleanupMockedAlerts,
  cleanupMockedExceptionLists,
  cleanupMockedEndpointAlerts,
  createMockedAlert,
  createMockedEndpointAlert,
  createMockedExceptionList,
  getAsyncTelemetryEventSender,
  getTelemetryTask,
  getTelemetryTaskType,
  getTelemetryTasks,
  initEndpointIndices,
  dropEndpointIndices,
  mockEndpointData,
  getTelemetryReceiver,
  mockPrebuiltRulesData,
} from './lib/telemetry_helpers';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Plugin as SecuritySolutionPlugin } from '../plugin';
import {
  TaskManagerPlugin,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import type { SecurityTelemetryTask } from '../lib/telemetry/task';
import { TelemetryChannel, type TelemetryEvent } from '../lib/telemetry/types';
import type { AsyncTelemetryEventsSender } from '../lib/telemetry/async_sender';
import endpointMetaTelemetryRequest from './__mocks__/endpoint-meta-telemetry-request.json';
import alertsDetectionsRequest from './__mocks__/alerts-detections-request.json';
import type { ITelemetryReceiver, TelemetryReceiver } from '../lib/telemetry/receiver';
import type { TaskMetric } from '../lib/telemetry/task_metrics.types';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';

jest.mock('axios');

const logFilePath = Path.join(__dirname, 'logs.log');

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
const securitySolutionStartSpy = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');
const mockedAxiosGet = jest.spyOn(axios, 'get');
const mockedAxiosPost = jest.spyOn(axios, 'post');

const securitySolutionPlugin = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

type Defer = () => void;

// Failing 9.0 version update: https://github.com/elastic/kibana/issues/192624
describe.skip('telemetry tasks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let tasks: SecurityTelemetryTask[];
  let asyncTelemetryEventSender: AsyncTelemetryEventsSender;
  let exceptionsList: ExceptionListSchema[] = [];
  let exceptionsListItem: ExceptionListItemSchema[] = [];
  let esClient: ElasticsearchClient;
  let telemetryReceiver: ITelemetryReceiver;
  let deferred: Defer[] = [];

  beforeAll(async () => {
    await removeFile(logFilePath);

    const servers = await setupTestServers(logFilePath);
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(securitySolutionStartSpy).toHaveBeenCalledTimes(1);

    tasks = getTelemetryTasks(securitySolutionStartSpy);
    asyncTelemetryEventSender = getAsyncTelemetryEventSender(securitySolutionStartSpy);

    // update queue config to not wait for a long bufferTimeSpanMillis
    asyncTelemetryEventSender.updateQueueConfig(TelemetryChannel.TASK_METRICS, {
      bufferTimeSpanMillis: 100,
      inflightEventsThreshold: 1_000,
      maxPayloadSizeBytes: 1024 * 1024,
    });

    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    expect(securitySolutionPlugin).toHaveBeenCalledTimes(1);
    telemetryReceiver = getTelemetryReceiver(securitySolutionPlugin);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAxiosGet();
    deferred = [];
  });

  afterEach(async () => {
    await cleanupMockedExceptionLists(
      exceptionsList,
      exceptionsListItem,
      kibanaServer.coreStart.savedObjects
    );
    await cleanupMockedAlerts(
      kibanaServer.coreStart.elasticsearch.client.asInternalUser,
      kibanaServer.coreStart.savedObjects
    ).then(() => {
      exceptionsList = [];
      exceptionsListItem = [];
    });
    await cleanupMockedEndpointAlerts(kibanaServer.coreStart.elasticsearch.client.asInternalUser);
    deferred.forEach((d) => {
      try {
        d();
      } catch (e) {
        // ignore errors
      }
    });
  });

  describe('detection-rules', () => {
    it('should execute when scheduled', async () => {
      await mockAndScheduleDetectionRulesTask();

      // wait until the events are sent to the telemetry server
      const body = await eventually(async () => {
        const found = mockedAxiosPost.mock.calls.find(([url]) => {
          return url.startsWith(ENDPOINT_STAGING) && url.endsWith('security-lists-v2');
        });

        expect(found).not.toBeFalsy();

        return JSON.parse((found ? found[1] : '{}') as string);
      });

      expect(body).not.toBeFalsy();
      expect(body.detection_rule).not.toBeFalsy();
    });

    it('should send task metrics', async () => {
      const [task, started] = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBeGreaterThan(0);
      requests.forEach((t) => {
        expect(t.taskMetric.passed).toEqual(true);
      });
    });
  });

  describe('sender configuration', () => {
    it('should use legacy sender by default', async () => {
      // launch a random task and verify it uses the new configuration
      const [task, started] = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task, started);
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach((r) => {
        expect(r.requestConfig).not.toBeFalsy();
        if (r.requestConfig && r.requestConfig.headers) {
          expect(r.requestConfig.headers['X-Telemetry-Sender']).not.toEqual('async');
        }
      });
    });

    it('should use new sender when configured', async () => {
      const configTaskType = 'security:telemetry-configuration';
      const configTask = getTelemetryTask(tasks, configTaskType);

      mockAxiosGet(fakeBufferAndSizesConfigAsyncEnabled);
      await eventually(async () => {
        await taskManagerPlugin.runSoon(configTask.getTaskId());
      });

      // wait until the task finishes
      await eventually(async () => {
        const found = (await taskManagerPlugin.fetch()).docs.find(
          (t) => t.taskType === configTaskType
        );
        expect(found).toBeFalsy();
      });

      const [task, started] = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task, started);
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach((r) => {
        expect(r.requestConfig).not.toBeFalsy();
        if (r.requestConfig && r.requestConfig.headers) {
          expect(r.requestConfig.headers['X-Telemetry-Sender']).toEqual('async');
        }
      });
    });

    it('should update sender queue config', async () => {
      const expectedConfig = fakeBufferAndSizesConfigWithQueues.sender_channels['task-metrics'];
      const configTaskType = 'security:telemetry-configuration';
      const configTask = getTelemetryTask(tasks, configTaskType);

      mockAxiosGet(fakeBufferAndSizesConfigWithQueues);
      await eventually(async () => {
        await taskManagerPlugin.runSoon(configTask.getTaskId());
      });

      await eventually(async () => {
        /* eslint-disable dot-notation */
        const taskMetricsConfigAfter = asyncTelemetryEventSender['queues']?.get(
          TelemetryChannel.TASK_METRICS
        );

        expect(taskMetricsConfigAfter?.bufferTimeSpanMillis).toEqual(
          expectedConfig.buffer_time_span_millis
        );
        expect(taskMetricsConfigAfter?.inflightEventsThreshold).toEqual(
          expectedConfig.inflight_events_threshold
        );
        expect(taskMetricsConfigAfter?.maxPayloadSizeBytes).toEqual(
          expectedConfig.max_payload_size_bytes
        );
      });
    });
  });

  describe('endpoint-diagnostics', () => {
    it('should execute when scheduled', async () => {
      await mockAndScheduleEndpointDiagnosticsTask();

      // wait until the events are sent to the telemetry server
      const body = await eventually(async () => {
        const found = mockedAxiosPost.mock.calls.find(([url]) => {
          return url.startsWith(ENDPOINT_STAGING) && url.endsWith(TelemetryChannel.ENDPOINT_ALERTS);
        });

        expect(found).not.toBeFalsy();

        return JSON.parse((found ? found[1] : '{}') as string);
      });

      expect(body).not.toBeFalsy();
      expect(body.Endpoint).not.toBeFalsy();
    });

    it('should enrich with license info', async () => {
      await mockAndScheduleEndpointDiagnosticsTask();

      // wait until the events are sent to the telemetry server
      const body = await eventually(async () => {
        const found = mockedAxiosPost.mock.calls.find(([url]) => {
          return url.startsWith(ENDPOINT_STAGING) && url.endsWith(TelemetryChannel.ENDPOINT_ALERTS);
        });

        expect(found).not.toBeFalsy();

        return JSON.parse((found ? found[1] : '{}') as string);
      });

      expect(body).not.toBeFalsy();
      expect(body.license).not.toBeFalsy();
      expect(body.license.status).not.toBeFalsy();
    });
  });

  describe('endpoint-meta-telemetry', () => {
    beforeEach(async () => {
      await initEndpointIndices(esClient);
    });

    afterEach(async () => {
      await dropEndpointIndices(esClient);
    });

    it('should execute when scheduled', async () => {
      await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);

      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual(endpointMetaTelemetryRequest.policy_response);
    });

    it('should manage runtime errors searching endpoint metrics', async () => {
      const fetchEndpointMetricsAbstract = telemetryReceiver.fetchEndpointMetricsAbstract;
      deferred.push(() => {
        telemetryReceiver.fetchEndpointMetricsAbstract = fetchEndpointMetricsAbstract;
      });

      const errorMessage = 'Something went wront';

      telemetryReceiver.fetchEndpointMetricsAbstract = jest.fn((_) =>
        Promise.reject(Error(errorMessage))
      );

      const [task, started] = await mockAndScheduleEndpointTask();

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(false);
      expect(metric.taskMetric.error_message).toBe(errorMessage);
    });

    it('should manage runtime errors searching fleet agents', async () => {
      const receiver: TelemetryReceiver = telemetryReceiver as TelemetryReceiver;
      const agentClient = receiver['agentClient']!;
      const listAgents = agentClient.listAgents;
      deferred.push(() => {
        agentClient.listAgents = listAgents;
      });

      const errorMessage = 'Error searching for fleet agents';

      agentClient.listAgents = jest.fn((_) => Promise.reject(Error(errorMessage)));

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual({});
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should work without fleet agents', async () => {
      const receiver: TelemetryReceiver = telemetryReceiver as TelemetryReceiver;
      const agentClient = receiver['agentClient']!;
      const listAgents = agentClient.listAgents;
      deferred.push(() => {
        agentClient.listAgents = listAgents;
      });

      agentClient.listAgents = jest.fn((_) =>
        Promise.resolve({
          agents: [],
          total: 0,
          page: 0,
          perPage: 0,
        })
      );

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual({});
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
      // expect(metric.error_message).toBe(errorMessage);
    });

    it('should manage runtime errors policy configs', async () => {
      const errorMessage = 'Error getting policy configs';
      const fetchPolicyConfigs = telemetryReceiver.fetchPolicyConfigs;
      deferred.push(() => {
        telemetryReceiver.fetchPolicyConfigs = fetchPolicyConfigs;
      });

      telemetryReceiver.fetchPolicyConfigs = jest.fn((_) => Promise.reject(Error(errorMessage)));

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual({});
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should manage unexpected errors dealing with policy configs', async () => {
      const fetchPolicyConfigs = telemetryReceiver.fetchPolicyConfigs;
      deferred.push(() => {
        telemetryReceiver.fetchPolicyConfigs = fetchPolicyConfigs;
      });

      telemetryReceiver.fetchPolicyConfigs = jest.fn((_) => {
        return Promise.resolve({
          package_policies: [
            {
              invalid: 'value',
              inputs: [
                {
                  unexpected: 'boom!',
                },
              ],
            },
          ],
        } as unknown as AgentPolicy);
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual({});
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should manage runtime errors fetching policy responses', async () => {
      const errorMessage = 'Error getting policy responses';
      const fetchEndpointPolicyResponses = telemetryReceiver.fetchEndpointPolicyResponses;
      deferred.push(() => {
        telemetryReceiver.fetchEndpointPolicyResponses = fetchEndpointPolicyResponses;
      });

      telemetryReceiver.fetchEndpointPolicyResponses = jest.fn((_from, _to) => {
        return Promise.reject(Error(errorMessage));
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should manage work with no policy responses', async () => {
      const fetchEndpointPolicyResponses = telemetryReceiver.fetchEndpointPolicyResponses;
      deferred.push(() => {
        telemetryReceiver.fetchEndpointPolicyResponses = fetchEndpointPolicyResponses;
      });

      telemetryReceiver.fetchEndpointPolicyResponses = jest.fn((_from, _to) => {
        return Promise.resolve(new Map());
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual({});

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should manage runtime errors fetching endpoint metadata', async () => {
      const errorMessage = 'Error getting policy responses';
      const fetchEndpointMetadata = telemetryReceiver.fetchEndpointMetadata;
      deferred.push(() => {
        telemetryReceiver.fetchEndpointMetadata = fetchEndpointMetadata;
      });

      telemetryReceiver.fetchEndpointMetadata = jest.fn((_from, _to) => {
        return Promise.reject(Error(errorMessage));
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual({
        ...endpointMetaTelemetryRequest.endpoint_meta,
        capabilities: [],
      });
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual(endpointMetaTelemetryRequest.policy_response);

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should work with no endpoint metadata', async () => {
      const fetchEndpointMetadata = telemetryReceiver.fetchEndpointMetadata;
      deferred.push(() => {
        telemetryReceiver.fetchEndpointMetadata = fetchEndpointMetadata;
      });

      telemetryReceiver.fetchEndpointMetadata = jest.fn((_from, _to) => {
        return Promise.resolve(new Map());
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      expect(endpointMetaRequests.length).toBe(2);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual({
        ...endpointMetaTelemetryRequest.endpoint_meta,
        capabilities: [],
      });
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual(endpointMetaTelemetryRequest.policy_response);

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });

    it('should manage runtime errors fetching paginating endpoint metrics documents', async () => {
      const receiver: TelemetryReceiver = telemetryReceiver as TelemetryReceiver;
      const docsPerPage = receiver['docsPerPage']!;
      const nextPage = receiver['nextPage']!;
      deferred.push(() => {
        receiver['docsPerPage'] = docsPerPage;
        receiver['nextPage'] = nextPage;
      });

      // force to pull one doc at a time
      receiver['docsPerPage'] = jest.fn((_index, _query) => {
        return Promise.resolve(1);
      });
      let pagesServed = 0;
      receiver['nextPage'] = jest.fn(async (query) => {
        // fail requesting the second doc
        if (pagesServed++ >= 1) {
          return Promise.reject(Error('Boom!'));
        }
        return esClient.search(query);
      });

      const [task, started] = await mockAndScheduleEndpointTask();

      const endpointMetaRequests = await getEndpointMetaRequests();

      // only one doc processed
      expect(endpointMetaRequests.length).toBe(1);
      const body = endpointMetaRequests[0];

      expect(body.endpoint_metrics).toStrictEqual(endpointMetaTelemetryRequest.endpoint_metrics);
      expect(body.endpoint_meta).toStrictEqual(endpointMetaTelemetryRequest.endpoint_meta);
      expect(body.policy_config).toStrictEqual(endpointMetaTelemetryRequest.policy_config);
      expect(body.policy_response).toStrictEqual(endpointMetaTelemetryRequest.policy_response);

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(true);
    });
  });

  describe('telemetry-prebuilt-rule-alerts', () => {
    it('should execute when scheduled', async () => {
      await mockAndSchedulePrebuiltRulesTask();

      const alertsDetectionsRequests = await getAlertsDetectionsRequests();

      expect(alertsDetectionsRequests.length).toBe(2);

      const body = alertsDetectionsRequests[0];

      expect(body.dll).toStrictEqual(alertsDetectionsRequest.dll);
      expect(body.process).toStrictEqual(alertsDetectionsRequest.process);
      expect(body.file).toStrictEqual(alertsDetectionsRequest.file);
    });

    it('should manage runtime errors searching endpoint metrics', async () => {
      const errorMessage = 'Something went wront';

      async function* mockedGenerator(
        _index: string,
        _executeFrom: string,
        _executeTo: string
      ): AsyncGenerator<TelemetryEvent[], void, unknown> {
        throw Error(errorMessage);
      }

      const fetchEndpointMetricsAbstract = telemetryReceiver.fetchPrebuiltRuleAlertsBatch;
      deferred.push(() => {
        telemetryReceiver.fetchPrebuiltRuleAlertsBatch = fetchEndpointMetricsAbstract;
      });

      telemetryReceiver.fetchPrebuiltRuleAlertsBatch = mockedGenerator;

      const [task, started] = await mockAndSchedulePrebuiltRulesTask();

      const requests = await getTaskMetricsRequests(task, started);

      expect(requests.length).toBe(1);

      const metric = requests[0];

      expect(metric).not.toBeFalsy();
      expect(metric.taskMetric.passed).toBe(false);
      expect(metric.taskMetric.error_message).toBe(errorMessage);
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function getEndpointMetaRequests(atLeast: number = 1): Promise<any[]> {
    return eventually(async () => {
      const found = mockedAxiosPost.mock.calls.filter(([url]) => {
        return url.startsWith(ENDPOINT_STAGING) && url.endsWith(TELEMETRY_CHANNEL_ENDPOINT_META);
      });

      expect(found).not.toBeFalsy();
      expect(found.length).toBeGreaterThanOrEqual(atLeast);

      return (found ?? []).flatMap((req) => {
        const ndjson = req[1] as string;
        return ndjson
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .map((l) => {
            return JSON.parse(l);
          });
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function getAlertsDetectionsRequests(atLeast: number = 1): Promise<any[]> {
    return eventually(async () => {
      const found = mockedAxiosPost.mock.calls.filter(([url]) => {
        return url.startsWith(ENDPOINT_STAGING) && url.endsWith(TELEMETRY_CHANNEL_DETECTION_ALERTS);
      });

      expect(found).not.toBeFalsy();
      expect(found.length).toBeGreaterThanOrEqual(atLeast);

      return (found ?? []).flatMap((req) => {
        const ndjson = req[1] as string;
        return ndjson
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .map((l) => {
            return JSON.parse(l);
          });
      });
    });
  }

  async function mockAndScheduleDetectionRulesTask(): Promise<[SecurityTelemetryTask, number]> {
    const task = getTelemetryTask(tasks, 'security:telemetry-detection-rules');

    // create some data
    await createMockedAlert(
      kibanaServer.coreStart.elasticsearch.client.asInternalUser,
      kibanaServer.coreStart.savedObjects
    );
    const { exceptionList, exceptionListItem } = await createMockedExceptionList(
      kibanaServer.coreStart.savedObjects
    );

    exceptionsList.push(exceptionList);
    exceptionsListItem.push(exceptionListItem);

    // schedule task to run ASAP
    return eventually(async () => {
      const started = performance.now();
      await taskManagerPlugin.runSoon(task.getTaskId());
      return [task, started];
    });
  }

  async function mockAndScheduleEndpointTask(): Promise<[SecurityTelemetryTask, number]> {
    const task = getTelemetryTask(tasks, 'security:endpoint-meta-telemetry');

    await mockEndpointData(esClient, kibanaServer.coreStart.savedObjects);

    // schedule task to run ASAP
    return eventually(async () => {
      const started = performance.now();
      await taskManagerPlugin.runSoon(task.getTaskId());
      return [task, started];
    });
  }

  async function mockAndSchedulePrebuiltRulesTask(): Promise<[SecurityTelemetryTask, number]> {
    const task = getTelemetryTask(tasks, 'security:telemetry-prebuilt-rule-alerts');

    await mockPrebuiltRulesData(esClient);

    // schedule task to run ASAP
    return eventually(async () => {
      const started = performance.now();
      await taskManagerPlugin.runSoon(task.getTaskId());
      return [task, started];
    });
  }

  async function mockAndScheduleEndpointDiagnosticsTask(): Promise<
    [SecurityTelemetryTask, number]
  > {
    const task = getTelemetryTask(tasks, 'security:endpoint-diagnostics');

    await createMockedEndpointAlert(kibanaServer.coreStart.elasticsearch.client.asInternalUser);

    // schedule task to run ASAP
    return eventually(async () => {
      const started = performance.now();
      await taskManagerPlugin.runSoon(task.getTaskId());
      return [task, started];
    });
  }

  function mockAxiosGet(bufferConfig: unknown = fakeBufferAndSizesConfigAsyncDisabled) {
    mockedAxiosPost.mockImplementation(
      async (_url: string, _data?: unknown, _config?: AxiosRequestConfig<unknown> | undefined) => {
        return { status: 200 };
      }
    );

    mockedAxiosGet.mockImplementation(async (url: string) => {
      if (url.startsWith(ENDPOINT_STAGING) && url.endsWith('ping')) {
        return { status: 200 };
      } else if (url.indexOf('kibana/manifest/artifacts') !== -1) {
        return {
          status: 200,
          data: 'x-pack/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
        };
      } else if (url.indexOf('telemetry-buffer-and-batch-sizes-v1') !== -1) {
        return {
          status: 200,
          data: bufferConfig,
        };
      }
      return { status: 404 };
    });
  }

  async function getTaskMetricsRequests(
    task: SecurityTelemetryTask,
    olderThan: number
  ): Promise<
    Array<{
      taskMetric: TaskMetric;
      requestConfig: AxiosRequestConfig<unknown> | undefined;
    }>
  > {
    const taskType = getTelemetryTaskType(task);
    return eventually(async () => {
      const calls = mockedAxiosPost.mock.calls.flatMap(([url, data, config]) => {
        return (data as string).split('\n').map((body) => {
          return { url, body, config };
        });
      });

      const requests = calls.filter(({ url, body }) => {
        return (
          body.indexOf(taskType) !== -1 &&
          url.startsWith(ENDPOINT_STAGING) &&
          url.endsWith('task-metrics')
        );
      });
      expect(requests.length).toBeGreaterThan(0);
      const filtered = requests
        .map((r) => {
          return {
            taskMetric: JSON.parse(r.body) as TaskMetric,
            requestConfig: r.config,
          };
        })
        .filter((t) => {
          return t.taskMetric.start_time >= olderThan;
        });
      expect(filtered.length).toBeGreaterThan(0);
      return filtered;
    });
  }
});

const fakeBufferAndSizesConfigAsyncDisabled = {
  telemetry_max_buffer_size: 100,
  max_security_list_telemetry_batch: 100,
  max_endpoint_telemetry_batch: 300,
  max_detection_rule_telemetry_batch: 1000,
  max_detection_alerts_batch: 50,
};

const fakeBufferAndSizesConfigAsyncEnabled = {
  ...fakeBufferAndSizesConfigAsyncDisabled,
  use_async_sender: true,
};

const fakeBufferAndSizesConfigWithQueues = {
  ...fakeBufferAndSizesConfigAsyncDisabled,
  sender_channels: {
    // should be ignored
    'invalid-channel': {
      buffer_time_span_millis: 500,
      inflight_events_threshold: 10,
      max_payload_size_bytes: 20,
    },
    'task-metrics': {
      buffer_time_span_millis: 500,
      inflight_events_threshold: 10,
      max_payload_size_bytes: 20,
    },
  },
};
