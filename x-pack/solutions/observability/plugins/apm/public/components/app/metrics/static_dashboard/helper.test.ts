/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSavedDashboardToPanels } from './helper';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';

describe('APM metrics static dashboard helpers', () => {
  describe('convertSavedDashboardToPanels', () => {
    const dataView = {
      id: 'id-1',
      title: 'test-data-view:metrics*,metrics*',
      getIndexPattern: () => 'test-data-view:metrics*,metrics*',
    } as unknown as DataView;

    it('returns undefined when dashboard file does not exist', async () => {
      const panels = await convertSavedDashboardToPanels({ dataView });

      expect(panels).toBeUndefined();
    });

    it('replaces placeholders in JSON with index pattern values from data view', async () => {
      const panels = await convertSavedDashboardToPanels({
        agentName: 'opentelemetry/java/opentelemetry-java-instrumentation',
        dataView,
      });

      expect(panels).toBeDefined();

      const esqlQuery = (panels as Array<{ config?: { query?: { esql?: string } } }>)
        .map((p) => p.config?.query?.esql)
        .find(Boolean);

      expect(esqlQuery).toContain('from test-data-view:metrics*,metrics*');
    });

    it('replaces placeholders in JSON with index pattern values from apm indices', async () => {
      const apmIndices = {
        metric: 'test-apm-indices:metrics*,metrics*',
      } as unknown as APMIndices;

      const panels = await convertSavedDashboardToPanels(
        { dataView, agentName: 'opentelemetry/java/opentelemetry-java-instrumentation' },
        apmIndices
      );

      const esqlQuery = (panels as Array<{ config?: { query?: { esql?: string } } }>)
        .map((p) => p.config?.query?.esql)
        .find(Boolean);

      expect(esqlQuery).toContain('from test-apm-indices:metrics*,metrics*');
    });
  });
});
