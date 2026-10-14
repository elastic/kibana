/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../../src/data_generators/replay';
import { GCS_BUCKET } from '../../../src/scenarios/constants';
import { evaluate } from '../evaluate';

const PAYMENT_UNREACHABLE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-unreachable',
};

const SNAPSHOT_NAME = 'payment-unreachable';
const ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

const ALERT_START_OFFSET_MS = 2 * 60 * 60 * 1000; // 2 hours ago

const screenContextAttachment = (from: string) => ({
  type: 'screen_context' as const,
  data: {
    app: 'observability-overview',
    url: 'http://localhost:5601/app/observability/overview',
    time_range: { from, to: 'now' },
  },
  hidden: true,
});

/**
 * Basic time range passing — no data replay needed.
 */
evaluate.describe(
  'Investigation Skill: Time Range',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('uses screen context time range in tool calls', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'tool-arguments: uses screen context time range',
          description: 'Verifies tool calls include start and end from screen context',
          examples: [
            {
              input: {
                question: 'What services are running?',
                attachments: [screenContextAttachment('now-2h')],
              },
              output: {
                criteria: [
                  'Tool calls include start="now-2h" matching the screen context time range',
                  'Tool calls include end="now" matching the screen context time range',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate('user-specified time range overrides screen context', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'tool-arguments: user time override',
          description: 'Verifies an explicit user time range takes precedence over screen context',
          examples: [
            {
              input: {
                question: 'Show me running services from the last 30 minutes',
                attachments: [screenContextAttachment('now-2h')],
              },
              output: {
                criteria: [
                  'The first observability tool call uses a 30-minute window (start="now-30m") matching the user\'s explicit time request, not the screen context start="now-2h". Subsequent fallback queries when results are empty are acceptable.',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate(
      'uses tool default time range without context or user time',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'tool-arguments: default time fallback',
            description:
              'Verifies the agent falls back to tool default when no time context is provided',
            examples: [
              {
                input: { question: 'What services are running?' },
                output: {
                  criteria: [
                    'Uses the default time range for the tool when no time context is provided (commonly start="now-1h" and end="now")',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );
  }
);

// Shared alert document factory — both describe blocks use the same shape.
function makeAlertDoc(id: string, alertStart: string, durationUs: number, serviceName: string) {
  return {
    '@timestamp': alertStart,
    'kibana.alert.uuid': id,
    'kibana.alert.rule.uuid': randomUUID(),
    'kibana.alert.rule.name': `Error count threshold — ${serviceName} service (payment unreachable)`,
    'kibana.alert.rule.category': 'APM Error count',
    'kibana.alert.rule.consumer': 'apm',
    'kibana.alert.rule.rule_type_id': 'apm.error_rate',
    'kibana.alert.status': 'active',
    'kibana.alert.start': alertStart,
    'kibana.alert.duration.us': durationUs,
    'kibana.alert.reason': `Error count for service ${serviceName}, env production is above the threshold of 1 with 47 errors in the last 5 minutes.`,
    'kibana.space_ids': ['default'],
    'service.name': serviceName,
    'service.environment': 'production',
  };
}

/**
 * Alert time window scenarios — shared replay, two synthetic alerts (frontend + checkout).
 *
 * Scenario 1: Alert attached explicitly, screen context now-15m. Agent must read
 * kibana.alert.start from get_alert_details and use it as the investigation anchor.
 *
 * Scenario 2: No attachment, screen context now-6h. Agent discovers alert via get_alerts
 * (get_alerts filters on kibana.alert.start so the wide context is required) then should
 * re-anchor to the alert start rather than continue using the full 6h window.
 */
evaluate.describe(
  'Investigation Skill: Time Range and Alerts',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;
    let attachedAlertId: string;
    let discoveredAlertId: string;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying payment-unreachable scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        PAYMENT_UNREACHABLE_GCS
      );

      const alertStart = new Date(Date.now() - ALERT_START_OFFSET_MS).toISOString();
      const durationUs = ALERT_START_OFFSET_MS * 1000;

      attachedAlertId = randomUUID();
      discoveredAlertId = randomUUID();

      log.info(`Indexing synthetic alerts with start time ${alertStart}`);
      await Promise.all([
        esClient.index({
          index: ALERTS_INDEX,
          id: attachedAlertId,
          document: makeAlertDoc(attachedAlertId, alertStart, durationUs, 'frontend'),
          refresh: true,
        }),
        esClient.index({
          index: ALERTS_INDEX,
          id: discoveredAlertId,
          document: makeAlertDoc(discoveredAlertId, alertStart, durationUs, 'checkout'),
          refresh: true,
        }),
      ]);
    });

    evaluate(
      'uses alert-derived time window (with pre-alert lookback) for attached alert',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'alert investigation — narrow screen context vs wide alert window',
            description:
              'Evaluates whether the agent uses an alert-derived time window (anchored around kibana.alert.start with a pre-alert lookback) when an alert is attached and the screen context is narrower than the alert age.',
            examples: [
              {
                input: {
                  question: 'Investigate this alert.',
                  attachments: [
                    screenContextAttachment('now-15m'),
                    {
                      type: 'observability.alert',
                      data: { alertId: attachedAlertId },
                    },
                  ],
                },
                output: {
                  criteria: [
                    'Calls get_alert_details to fetch the alert document before beginning the investigation',
                    'Investigation tool calls (get_services, get_service_topology, get_traces, get_logs, etc.) use a start time anchored to the alert start (kibana.alert.start, ~2 hours ago) — not the 15-minute screen context window',
                    'Tool call start times include a lookback buffer before the alert start (at least ~5 minutes earlier) so the query captures the pre-alert lead-up, not just the period from the alert start onward',
                    'get_service_topology calls use a wide lookback — at least 1 hour before the alert start, ideally ~24 hours — to capture the dependency graph baseline (topology changes slowly so narrow windows miss context)',
                    'Investigates the frontend service named in the alert',
                  ],
                  expectedTools: [
                    'observability.get_services',
                    'observability.get_service_topology',
                  ],
                },
                metadata: { expectedSkill: 'investigation' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'uses alert-derived time window (with pre-alert lookback) after discovering alert via get_alerts',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'alert time window — discovered via get_alerts',
            description:
              'Evaluates whether the agent re-anchors to an alert-derived time window (around kibana.alert.start with a pre-alert lookback) after discovering an active alert via get_alerts, instead of continuing to use the screen context window.',
            examples: [
              {
                input: {
                  question: 'Are there any active alerts? Investigate whatever you find.',
                  attachments: [screenContextAttachment('now-6h')],
                },
                output: {
                  criteria: [
                    'Calls observability.get_alerts to discover active alerts',
                    'After finding the alert (started ~2 hours ago), uses the alert start time as the anchor for subsequent investigation tool calls — start parameter should be close to 2h ago, not 6h ago',
                    'Tool call start times include a lookback buffer before the alert start (at least ~5 minutes earlier) so the query captures the pre-alert lead-up, not just the period from the alert start onward',
                    'get_service_topology calls use a wide lookback — at least 1 hour before the alert start, ideally ~24 hours — to capture the dependency graph baseline (topology changes slowly so narrow windows miss context)',
                    'Investigates the checkout service named in the alert',
                  ],
                  expectedTools: ['observability.get_alerts', 'observability.get_service_topology'],
                },
                metadata: { expectedSkill: 'investigation' },
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ esClient, log }) => {
      log.debug('Cleaning up synthetic alerts and replayed data');
      await Promise.all([
        esClient
          .delete({ index: ALERTS_INDEX, id: attachedAlertId, refresh: true })
          .catch(() => {}),
        esClient
          .delete({ index: ALERTS_INDEX, id: discoveredAlertId, refresh: true })
          .catch(() => {}),
        cleanObservabilityDataStreams(esClient, replayResult, log),
      ]);
    });
  }
);
