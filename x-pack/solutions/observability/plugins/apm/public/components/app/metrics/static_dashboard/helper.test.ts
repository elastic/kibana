/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSavedDashboardToPanels, hasDashboard, getMetricIndexPattern } from './helper';
import type { DashboardFileName } from './dashboards/dashboard_catalog';
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

      const panels = await convertSavedDashboardToPanels({
        dataView,
        agentName: 'opentelemetry/java/opentelemetry-java-instrumentation',
        apmIndices,
      });

      const esqlQuery = (panels as Array<{ config?: { query?: { esql?: string } } }>)
        .map((p) => p.config?.query?.esql)
        .find(Boolean);

      expect(esqlQuery).toContain('from test-apm-indices:metrics*,metrics*');
    });

    it('scopes OTel dashboard to .otel- patterns when apmIndices is provided', async () => {
      const apmIndices = {
        metric: 'metrics-apm.internal-*,metrics-*.otel-*',
      } as unknown as APMIndices;

      const panels = await convertSavedDashboardToPanels({
        dataView,
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        apmIndices,
      });

      expect(panels).toBeDefined();

      const esqlQuery = (panels as Array<{ config?: { query?: { esql?: string } } }>)
        .map((p) => p.config?.query?.esql)
        .find(Boolean);

      expect(esqlQuery).toContain('FROM metrics-*.otel-*');
      expect(esqlQuery).not.toContain('metrics-apm.internal-*');
    });
  });

  describe('getMetricIndexPattern', () => {
    const dataView = {
      id: 'id-1',
      getIndexPattern: () => 'metrics-apm.internal-*,metrics-*.otel-*',
    } as unknown as DataView;

    it('returns full pattern when dashboard is neither otel_native nor classic_apm', () => {
      const result = getMetricIndexPattern(
        'classic_apm-apm-nodejs' as DashboardFileName,
        undefined,
        dataView
      );
      expect(result).toBe('metrics-apm.internal-*');
    });

    it('filters to .otel- patterns for otel_native- dashboards', () => {
      const result = getMetricIndexPattern(
        'otel_native-edot-java' as DashboardFileName,
        undefined,
        dataView
      );
      expect(result).toBe('metrics-*.otel-*');
    });

    it('filters to non-.otel- patterns for classic_apm- dashboards', () => {
      const result = getMetricIndexPattern(
        'classic_apm-apm-java' as DashboardFileName,
        undefined,
        dataView
      );
      expect(result).toBe('metrics-apm.internal-*');
    });

    it('prefers apmIndices.metric over dataView.getIndexPattern()', () => {
      const apmIndices = {
        metric: 'custom-metrics-apm-*,custom-metrics-*.otel-*',
      } as unknown as APMIndices;

      const result = getMetricIndexPattern(
        'otel_native-edot-java' as DashboardFileName,
        apmIndices,
        dataView
      );
      expect(result).toBe('custom-metrics-*.otel-*');
    });

    it('falls back to full pattern when no .otel- patterns exist for otel_native dashboard', () => {
      const classicOnlyDataView = {
        id: 'id-2',
        getIndexPattern: () => 'metrics-apm.internal-*',
      } as unknown as DataView;

      const result = getMetricIndexPattern(
        'otel_native-edot-java' as DashboardFileName,
        undefined,
        classicOnlyDataView
      );
      expect(result).toBe('metrics-apm.internal-*');
    });

    it('falls back to full pattern when no non-.otel- patterns exist for classic dashboard', () => {
      const otelOnlyDataView = {
        id: 'id-3',
        getIndexPattern: () => 'metrics-*.otel-*',
      } as unknown as DataView;

      const result = getMetricIndexPattern(
        'classic_apm-apm-java' as DashboardFileName,
        undefined,
        otelOnlyDataView
      );
      expect(result).toBe('metrics-*.otel-*');
    });

    it('handles comma-separated patterns with whitespace', () => {
      const spacedDataView = {
        id: 'id-4',
        getIndexPattern: () => 'metrics-apm.internal-* , metrics-*.otel-* , metrics-custom-*',
      } as unknown as DataView;

      const result = getMetricIndexPattern(
        'otel_native-edot-java' as DashboardFileName,
        undefined,
        spacedDataView
      );
      expect(result).toBe('metrics-*.otel-*');
    });
  });

  describe('hasDashboard', () => {
    it('returns false when agentName is undefined', () => {
      expect(hasDashboard({})).toBe(false);
    });

    it('returns true for a known default dashboard', () => {
      expect(
        hasDashboard({
          agentName: 'opentelemetry/dotnet/elastic',
          telemetrySdkName: undefined,
          telemetrySdkLanguage: undefined,
        })
      ).toBe(true);
    });

    it('resolves EDOT .NET 8 to a versioned dashboard via <=8 rule', () => {
      expect(
        hasDashboard({
          agentName: 'opentelemetry/dotnet/elastic',
          runtimeVersion: '8.0.11',
        })
      ).toBe(true);
    });

    it('falls back to default for EDOT .NET 9 (above <=8 rule)', () => {
      expect(
        hasDashboard({
          agentName: 'opentelemetry/dotnet/elastic',
          runtimeVersion: '9.0.0',
        })
      ).toBe(true);
    });

    it('falls back to default when runtimeVersion is invalid', () => {
      expect(
        hasDashboard({
          agentName: 'opentelemetry/dotnet/elastic',
          runtimeVersion: 'preview',
        })
      ).toBe(true);
    });

    it('returns false for an unknown agent', () => {
      expect(
        hasDashboard({
          agentName: 'my-custom-agent',
        })
      ).toBe(false);
    });
  });
});
