/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core/server';
import { setupKibanaServer, setupTestServers } from './lib/setup_test_servers';
import { IEvent } from '../types';
import { EsContextCtorParams } from '../es/context';

const { createEsContext: createEsContextMock } = jest.requireMock('../es');
jest.mock('../es', () => {
  const actual = jest.requireActual('../es');
  return {
    ...actual,
    createEsContext: jest.fn().mockImplementation((opts) => {
      return new actual.createEsContext(opts);
    }),
  };
});

describe('update existing event log mappings on startup', () => {
  it('should update mappings for existing event log indices', async () => {
    const setupResult = await setupTestServers();
    const esServer = setupResult.esServer;
    let kibanaServer = setupResult.kibanaServer;

    expect(createEsContextMock).toHaveBeenCalledTimes(1);
    let createEsContextOpts: EsContextCtorParams = createEsContextMock.mock.calls[0][0];
    let infoLogSpy = jest.spyOn(createEsContextOpts.logger, 'info');

    await retry(async () => {
      expect(infoLogSpy).toHaveBeenCalledWith(`Creating datastream .kibana-event-log-ds`);
      expect(infoLogSpy).not.toHaveBeenCalledWith(
        `Updating concrete index mappings for .kibana-event-log-ds`
      );
    });

    await injectEventLogDoc(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      '@timestamp': '2024-09-19T20:38:47.124Z',
      event: {
        provider: 'alerting',
        action: 'execute',
        kind: 'alert',
        category: ['AlertingExample'],
        start: '2024-09-19T20:38:46.963Z',
        outcome: 'success',
        end: '2024-09-19T20:38:47.124Z',
        duration: '161000000',
      },
      kibana: {
        alert: {
          rule: {
            rule_type_id: 'example.always-firing',
            consumer: 'alerts',
            execution: {
              uuid: '578f0ca3-aa08-4700-aed0-236c888c6cae',
              metrics: {
                number_of_triggered_actions: 0,
                number_of_generated_actions: 0,
                alert_counts: {
                  active: 5,
                  new: 5,
                  recovered: 5,
                },
                number_of_delayed_alerts: 0,
                number_of_searches: 0,
                es_search_duration_ms: 0,
                total_search_duration_ms: 0,
                claim_to_start_duration_ms: 26,
                total_run_duration_ms: 187,
                prepare_rule_duration_ms: 18,
                rule_type_run_duration_ms: 0,
                process_alerts_duration_ms: 1,
                persist_alerts_duration_ms: 64,
                trigger_actions_duration_ms: 0,
                process_rule_duration_ms: 69,
              },
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'alert',
            id: '3389d834-edc2-4245-a319-3ff689f5bf3b',
            type_id: 'example.always-firing',
          },
        ],
        space_ids: ['default'],
        task: {
          scheduled: '2024-09-19T20:38:46.797Z',
          schedule_delay: 166000000,
        },
        alerting: {
          outcome: 'success',
          status: 'active',
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '9.0.0',
      },
      rule: {
        id: '3389d834-edc2-4245-a319-3ff689f5bf3b',
        license: 'basic',
        category: 'example.always-firing',
        ruleset: 'AlertingExample',
        name: 'e',
      },
      message: "rule executed: example.always-firing:3389d834-edc2-4245-a319-3ff689f5bf3b: 'e'",
      ecs: {
        version: '1.8.0',
      },
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    infoLogSpy.mockRestore();

    const restartKb = await setupKibanaServer();
    kibanaServer = restartKb.kibanaServer;

    expect(createEsContextMock).toHaveBeenCalledTimes(2);
    createEsContextOpts = createEsContextMock.mock.calls[1][0];
    infoLogSpy = jest.spyOn(createEsContextOpts.logger, 'info');
    const debugLogSpy = jest.spyOn(createEsContextOpts.logger, 'debug');

    await retry(async () => {
      expect(infoLogSpy).toHaveBeenCalledWith(
        `Updating concrete index mappings for .kibana-event-log-ds`
      );
      expect(debugLogSpy).toHaveBeenCalledWith(
        `Successfully updated concrete index mappings for .kibana-event-log-ds`
      );
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });
});

async function injectEventLogDoc(esClient: ElasticsearchClient, doc: IEvent) {
  await esClient.index({
    index: '.kibana-event-log-ds',
    document: doc,
  });
}

interface RetryOpts {
  times: number;
  intervalMs: number;
}

async function retry<T>(cb: () => Promise<T>, options: RetryOpts = { times: 60, intervalMs: 500 }) {
  let attempt = 1;
  while (true) {
    try {
      return await cb();
    } catch (e) {
      if (attempt >= options.times) {
        throw e;
      }
    }
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}
