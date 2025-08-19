/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cli, DEFAULTS } from '@kbn/data-forge';
import { test } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';

export interface SloDataFixture {
  generateSloData: () => Promise<void>;
  addSLO: () => Promise<unknown>;
}

export const sloDataFixture = test.extend<{}, { sloData: SloDataFixture }>({
  sloData: [
    async ({ kbnUrl, config, kbnClient, log }, use) => {
      const kibanaUrl = kbnUrl.get();
      const elasticsearchUrl = config.hosts.elasticsearch;

      const generateSloData = async () => {
        log.info('Generating synthetic SLO data');
        await cli({
          kibanaUrl,
          elasticsearchHost: elasticsearchUrl,
          lookback: DEFAULTS.LOOKBACK,
          eventsPerCycle: DEFAULTS.EVENTS_PER_CYCLE,
          payloadSize: DEFAULTS.PAYLOAD_SIZE,
          concurrency: DEFAULTS.CONCURRENCY,
          indexInterval: 10_000,
          dataset: 'fake_stack',
          scenario: DEFAULTS.SCENARIO,
          elasticsearchUsername: config.auth.username,
          elasticsearchPassword: config.auth.password,
          kibanaUsername: config.auth.username,
          kibanaPassword: config.auth.password,
          installKibanaAssets: true,
          eventTemplate: DEFAULTS.EVENT_TEMPLATE,
          reduceWeekendTrafficBy: DEFAULTS.REDUCE_WEEKEND_TRAFFIC_BY,
          ephemeralProjectIds: DEFAULTS.EPHEMERAL_PROJECT_IDS,
          alignEventsToInterval: DEFAULTS.ALIGN_EVENTS_TO_INTERVAL,
          scheduleEnd: 'now+10m',
          slashLogs: false,
        }).then((res) => log.debug(res as any));
      };

      const addSLO = async () => {
        const example = {
          name: 'Test Stack SLO',
          description: '',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'kbn-data-forge-fake_stack.admin-console-*',
              filter: '',
              good: 'log.level : "INFO" ',
              total: '',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'occurrences',
          timeWindow: {
            duration: '30d',
            type: 'rolling',
          },
          objective: {
            target: 0.99,
          },
          tags: [],
          groupBy: ['user.id'],
          settings: {
            preventInitialBackfill: true,
          },
        };

        try {
          const { data } = await (kbnClient as KbnClient).request({
            description: 'Create SLOs',
            path: '/api/observability/slos',
            body: example,
            method: 'POST',
          });
          return data;
        } catch (e) {
          log.error(`Failed to create SLO: ${(e as Error).message}`);
          throw e;
        }
      };

      await use({ generateSloData, addSLO });
    },
    { scope: 'worker' },
  ],
});
