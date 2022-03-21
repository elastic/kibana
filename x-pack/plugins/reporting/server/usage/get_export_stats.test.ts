/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExportTypesRegistry } from '../lib';
import { getExportStats } from './get_export_stats';
import { getExportTypesHandler } from './get_export_type_handler';
import { FeatureAvailabilityMap } from './types';

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
  featureMap = { PNG: true, csv: true, csv_searchsource: true, printable_pdf: true };
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
      PNG: { available: true, total: 3, output_size: sizesAggResponse },
      printable_pdf: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 3 },
        layout: { preserve_layout: 3, print: 0 },
      },
      csv_searchsource: {
        available: true,
        total: 3,
        output_size: sizesAggResponse,
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
      "deprecated": 0,
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 0,
        "print": 0,
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
  expect(result.csv).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 0,
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 0,
        "print": 0,
      },
      "total": 0,
    }
  `);
  expect(result.csv_searchsource).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 0,
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 0,
        "print": 0,
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
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 3,
        "print": 0,
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
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 0,
        "print": 0,
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

test('CSV counts, provides all jobs implicitly deprecated due to jobtype', () => {
  const result = getExportStats(
    {
      csv: {
        available: true,
        total: 15,
        deprecated: 0,
        output_size: sizesAggResponse,
      },
    },
    featureMap,
    exportTypesHandler
  );
  expect(result.csv).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 0,
        "dashboard": 0,
        "search": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 15,
      "layout": Object {
        "canvas": 0,
        "preserve_layout": 0,
        "print": 0,
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
