/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { createMockReportingCore } from '../test_helpers';
import { getExportStats } from './get_export_stats';
import { getExportTypesHandler } from './get_export_type_handler';
import { ErrorCodeStats, FeatureAvailabilityMap, MetricsStats } from './types';

let featureMap: FeatureAvailabilityMap;
const sizesAggResponse = {
  '1.0': 5093470.0,
  '5.0': 5093470.0,
  '25.0': 5093470.0,
  '50.0': 8514532.0,
  '75.0': 1.1935594e7,
  '95.0': 1.1935594e7,
  '99.0': 1.1935594e7,
};
let exportTypesRegistry: ExportTypesRegistry;
let exportTypesHandler: ReturnType<typeof getExportTypesHandler>;

beforeEach(async () => {
  const mockReporting = await createMockReportingCore(createMockConfigSchema());
  exportTypesRegistry = mockReporting.getExportTypesRegistry();
  exportTypesHandler = getExportTypesHandler(exportTypesRegistry);
  featureMap = { PNG: true, csv_searchsource: true };
});

test('PNG counts, provided count of deprecated jobs explicitly', () => {
  const result = getExportStats(
    {
      PNG: {
        available: true,
        total: 15,
        deprecated: 5,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 0 },
        metrics: { png_cpu: {}, png_memory: {} } as MetricsStats,
        error_codes: {} as ErrorCodeStats,
      },
    },
    featureMap,
    exportTypesHandler
  );
  expect(result.PNG).toMatchInlineSnapshot(`undefined`);
});

test('Incorporate queue times', () => {
  const result = getExportStats(
    {
      queue_times: {
        min: 45,
        max: 105,
        avg: 75.01,
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.queue_times).toMatchInlineSnapshot(`
    Object {
      "avg": 75.01,
      "max": 105,
      "min": 45,
    }
  `);
});

test('Incorporate execution times', () => {
  const result = getExportStats(
    {
      PNGV2: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: {},
        metrics: {
          png_cpu: { '50.0': 0.01, '75.0': 0.01, '95.0': 0.01, '99.0': 0.01 },
          png_memory: { '50.0': 3485, '75.0': 3496, '95.0': 3678, '99.0': 3782 },
        },
        execution_times: {
          avg: 75.01,
          max: 105,
          min: 45,
        },
        error_codes: {} as ErrorCodeStats,
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.PNGV2.execution_times).toMatchInlineSnapshot(`
    Object {
      "avg": 75.01,
      "max": 105,
      "min": 45,
    }
  `);
});

test('Incorporate metric stats', () => {
  const result = getExportStats(
    {
      PNGV2: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 3 },
        metrics: {
          png_cpu: { '50.0': 0.01, '75.0': 0.01, '95.0': 0.01, '99.0': 0.01 },
          png_memory: { '50.0': 3485, '75.0': 3496, '95.0': 3678, '99.0': 3782 },
        },
        error_codes: {} as ErrorCodeStats,
      },
      printable_pdf_v2: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        metrics: {
          pdf_cpu: { '50.0': 0.01, '75.0': 0.01, '95.0': 0.01, '99.0': 0.01 },
          pdf_memory: { '50.0': 3485, '75.0': 3496, '95.0': 3678, '99.0': 3782 },
          pdf_pages: { '50.0': 4, '75.0': 4, '95.0': 4, '99.0': 4 },
        },
        app: { dashboard: 3, visualization: 0, 'canvas workpad': 0 },
        layout: { preserve_layout: 3, print: 0, canvas: 0 },
        error_codes: {} as ErrorCodeStats,
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.PNGV2.metrics).toMatchInlineSnapshot(`
    Object {
      "png_cpu": Object {
        "50.0": 0.01,
        "75.0": 0.01,
        "95.0": 0.01,
        "99.0": 0.01,
      },
      "png_memory": Object {
        "50.0": 3485,
        "75.0": 3496,
        "95.0": 3678,
        "99.0": 3782,
      },
    }
  `);
  expect(result.printable_pdf_v2.metrics).toMatchInlineSnapshot(`
    Object {
      "pdf_cpu": Object {
        "50.0": 0.01,
        "75.0": 0.01,
        "95.0": 0.01,
        "99.0": 0.01,
      },
      "pdf_memory": Object {
        "50.0": 3485,
        "75.0": 3496,
        "95.0": 3678,
        "99.0": 3782,
      },
      "pdf_pages": Object {
        "50.0": 4,
        "75.0": 4,
        "95.0": 4,
        "99.0": 4,
      },
    }
  `);
});

test('Incorporate error code stats', () => {
  const result = getExportStats(
    {
      PNGV2: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 3 },
        metrics: { png_cpu: {}, png_memory: {} } as MetricsStats,
        error_codes: {
          authentication_expired_error: 5,
          queue_timeout_error: 1,
          unknown_error: 0,
          kibana_shutting_down_error: 1,
          browser_could_not_launch_error: 2,
          browser_unexpectedly_closed_error: 8,
          browser_screenshot_error: 27,
          visual_reporting_soft_disabled_error: 1,
          invalid_layout_parameters_error: 0,
        },
      },
      printable_pdf_v2: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        metrics: { png_cpu: {}, png_memory: {} } as MetricsStats,
        app: { dashboard: 3, visualization: 0, 'canvas workpad': 0 },
        layout: { preserve_layout: 3, print: 0, canvas: 0 },
        error_codes: {
          pdf_worker_out_of_memory_error: 99,
          authentication_expired_error: 5,
          queue_timeout_error: 1,
          unknown_error: 0,
          kibana_shutting_down_error: 1,
          browser_could_not_launch_error: 2,
          browser_unexpectedly_closed_error: 8,
          browser_screenshot_error: 27,
          visual_reporting_soft_disabled_error: 1,
          invalid_layout_parameters_error: 0,
        },
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.PNGV2.error_codes).toMatchInlineSnapshot(`
    Object {
      "authentication_expired_error": 5,
      "browser_could_not_launch_error": 2,
      "browser_screenshot_error": 27,
      "browser_unexpectedly_closed_error": 8,
      "invalid_layout_parameters_error": 0,
      "kibana_shutting_down_error": 1,
      "queue_timeout_error": 1,
      "unknown_error": 0,
      "visual_reporting_soft_disabled_error": 1,
    }
  `);
  expect(result.printable_pdf_v2.error_codes).toMatchInlineSnapshot(`
    Object {
      "authentication_expired_error": 5,
      "browser_could_not_launch_error": 2,
      "browser_screenshot_error": 27,
      "browser_unexpectedly_closed_error": 8,
      "invalid_layout_parameters_error": 0,
      "kibana_shutting_down_error": 1,
      "pdf_worker_out_of_memory_error": 99,
      "queue_timeout_error": 1,
      "unknown_error": 0,
      "visual_reporting_soft_disabled_error": 1,
    }
  `);
});
