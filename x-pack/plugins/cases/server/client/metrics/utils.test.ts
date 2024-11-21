/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMetricsFeatureField } from '../../../common/types/api';
import { CaseMetricsFeature } from '../../../common/types/api';
import { createMockClient, createMockClientArgs } from './test_utils/client';
import { buildHandlers } from './utils';

describe('utils', () => {
  describe('buildHandlers', () => {
    const casesClient = createMockClient();
    const clientArgs = createMockClientArgs();
    const SINGLE_CASE_FEATURES: CasesMetricsFeatureField[] = [
      CaseMetricsFeature.ALERTS_COUNT,
      CaseMetricsFeature.ALERTS_HOSTS,
      CaseMetricsFeature.ALERTS_USERS,
      CaseMetricsFeature.ACTIONS_ISOLATE_HOST,
      CaseMetricsFeature.CONNECTORS,
      CaseMetricsFeature.LIFESPAN,
    ];

    const CASES_FEATURES: CasesMetricsFeatureField[] = [CaseMetricsFeature.MTTR];

    it('returns the correct single case handlers', async () => {
      const handlers = buildHandlers(
        {
          caseId: 'test-case-id',
          features: SINGLE_CASE_FEATURES,
        },
        casesClient,
        clientArgs.clientArgs
      );

      handlers.forEach((handler) => {
        // @ts-expect-error
        expect(handler.caseId).toBe('test-case-id');
        expect(
          Array.from(handler.getFeatures().values()).every((feature) =>
            SINGLE_CASE_FEATURES.includes(feature)
          )
        ).toBe(true);
      });
    });

    it('returns the correct cases handlers', async () => {
      const handlers = buildHandlers(
        {
          features: CASES_FEATURES,
          from: '2022-04-28T15:18:00.000Z',
          to: '2022-04-28T15:22:00.000Z',
          owner: 'cases',
        },
        casesClient,
        clientArgs.clientArgs
      );

      handlers.forEach((handler) => {
        // @ts-expect-error
        expect(handler.from).toBe('2022-04-28T15:18:00.000Z');
        // @ts-expect-error
        expect(handler.to).toBe('2022-04-28T15:22:00.000Z');
        // @ts-expect-error
        expect(handler.owner).toBe('cases');

        expect(
          Array.from(handler.getFeatures().values()).every((feature) =>
            CASES_FEATURES.includes(feature)
          )
        ).toBe(true);
      });
    });

    it.each([
      [
        { caseId: 'test-case-id' },
        'invalid features: [not-exists], please only provide valid features: [actions.isolateHost, alerts.count, alerts.hosts, alerts.users, connectors, lifespan]',
      ],
      [
        { caseId: null },
        'invalid features: [not-exists], please only provide valid features: [mttr, status]',
      ],
    ])('throws if the feature is not supported: %s', async (opts, msg) => {
      expect(() =>
        buildHandlers(
          {
            ...opts,
            // @ts-expect-error
            features: ['not-exists'],
          },
          casesClient,
          clientArgs.clientArgs
        )
      ).toThrow(msg);
    });

    it('filters the handlers correctly', async () => {
      const handlers = buildHandlers(
        {
          caseId: 'test-case-id',
          features: [CaseMetricsFeature.ALERTS_COUNT],
        },
        casesClient,
        clientArgs.clientArgs
      );

      const handler = Array.from(handlers)[0];
      // @ts-expect-error
      expect(handler.caseId).toBe('test-case-id');
      expect(Array.from(handler.getFeatures().values())).toEqual([CaseMetricsFeature.ALERTS_COUNT]);
    });

    it('set up the feature correctly', async () => {
      const handlers = buildHandlers(
        {
          caseId: 'test-case-id',
          features: [CaseMetricsFeature.ALERTS_HOSTS],
        },
        casesClient,
        clientArgs.clientArgs
      );

      const handler = Array.from(handlers)[0];
      // @ts-expect-error
      const aggregationBuilder = handler.aggregationBuilders[0];
      expect(aggregationBuilder.getName()).toBe('hosts');
    });
  });
});
