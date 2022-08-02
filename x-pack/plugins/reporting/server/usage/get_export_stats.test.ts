/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExportTypesRegistry } from '../lib';
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

beforeEach(() => {
  featureMap = { PNG: true, csv_searchsource: true, printable_pdf: true };
});

const exportTypesHandler = getExportTypesHandler(getExportTypesRegistry());

test('Model of job status and status-by-pdf-app', () => {
  const result = getExportStats(
    {
      status: { completed: 0, processing: 1, pending: 2, failed: 3 },
      statuses: {
        processing: { printable_pdf: { 'canvas workpad': 1 } },
        pending: { printable_pdf: { dashboard: 1, 'canvas workpad': 1 } },
        failed: { printable_pdf: { visualization: 2, dashboard: 2, 'canvas workpad': 1 } },
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.status).toMatchInlineSnapshot(`
    Object {
      "completed": 0,
      "failed": 3,
      "pending": 2,
      "processing": 1,
    }
  `);
  expect(result.statuses).toMatchInlineSnapshot(`
    Object {
      "failed": Object {
        "printable_pdf": Object {
          "canvas workpad": 1,
          "dashboard": 2,
          "visualization": 2,
        },
      },
      "pending": Object {
        "printable_pdf": Object {
          "canvas workpad": 1,
          "dashboard": 1,
        },
      },
      "processing": Object {
        "printable_pdf": Object {
          "canvas workpad": 1,
        },
      },
    }
  `);
});

test('Model of jobTypes', () => {
  const result = getExportStats(
    {
      PNG: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 3, 'canvas workpad': 0 },
        metrics: { png_cpu: {}, png_memory: {} } as MetricsStats,
        error_codes: {} as ErrorCodeStats,
      },
      printable_pdf: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 3 },
        layout: { preserve_layout: 3, print: 0, canvas: 0 },
        metrics: { pdf_cpu: {}, pdf_memory: {}, pdf_pages: {} } as MetricsStats,
        error_codes: {} as ErrorCodeStats,
      },
      csv_searchsource: {
        available: true,
        total: 3,
        app: { search: 3 },
        output_size: sizesAggResponse,
        metrics: { csv_rows: {} } as MetricsStats,
        error_codes: {} as ErrorCodeStats,
      },
    },
    featureMap,
    exportTypesHandler
  );

  expect(result.PNG).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 0,
        "visualization": 3,
      },
      "available": true,
      "deprecated": 0,
      "error_codes": Object {},
      "execution_times": undefined,
      "layout": undefined,
      "metrics": Object {
        "png_cpu": Object {},
        "png_memory": Object {},
      },
      "output_size": Object {
        "1.0": 5093470,
        "25.0": 5093470,
        "5.0": 5093470,
        "50.0": 8514532,
        "75.0": 11935594,
        "95.0": 11935594,
        "99.0": 11935594,
      },
      "total": 3,
    }
  `);
  expect(result.csv_searchsource).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 3,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 0,
      "error_codes": Object {},
      "execution_times": undefined,
      "layout": undefined,
      "metrics": Object {
        "csv_rows": Object {},
      },
      "output_size": Object {
        "1.0": 5093470,
        "25.0": 5093470,
        "5.0": 5093470,
        "50.0": 8514532,
        "75.0": 11935594,
        "95.0": 11935594,
        "99.0": 11935594,
      },
      "total": 3,
    }
  `);
  expect(result.printable_pdf).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 3,
        "dashboard": 0,
        "search": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 0,
      "error_codes": Object {},
      "execution_times": undefined,
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 3,
        "print": 0,
      },
      "metrics": Object {
        "pdf_cpu": Object {},
        "pdf_memory": Object {},
        "pdf_pages": Object {},
      },
      "output_size": Object {
        "1.0": 5093470,
        "25.0": 5093470,
        "5.0": 5093470,
        "50.0": 8514532,
        "75.0": 11935594,
        "95.0": 11935594,
        "99.0": 11935594,
      },
      "total": 3,
    }
  `);
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
  expect(result.PNG).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 5,
      "error_codes": Object {},
      "execution_times": undefined,
      "layout": undefined,
      "metrics": Object {
        "png_cpu": Object {},
        "png_memory": Object {},
      },
      "output_size": Object {
        "1.0": 5093470,
        "25.0": 5093470,
        "5.0": 5093470,
        "50.0": 8514532,
        "75.0": 11935594,
        "95.0": 11935594,
        "99.0": 11935594,
      },
      "total": 15,
    }
  `);
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
      csv_searchsource_immediate: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        metrics: { png_cpu: {}, png_memory: {} } as MetricsStats,
        app: { dashboard: 3, visualization: 0, 'canvas workpad': 0 },
        error_codes: {
          authentication_expired_error: 5,
          queue_timeout_error: 1,
          unknown_error: 0,
          kibana_shutting_down_error: 1,
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

  expect(result.csv_searchsource_immediate.error_codes).toMatchInlineSnapshot(`
    Object {
      "authentication_expired_error": 5,
      "kibana_shutting_down_error": 1,
      "queue_timeout_error": 1,
      "unknown_error": 0,
    }
  `);
});
