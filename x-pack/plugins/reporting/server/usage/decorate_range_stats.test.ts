/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decorateRangeStats } from './decorate_range_stats';
import { FeatureAvailabilityMap } from './types';

let featureMap: FeatureAvailabilityMap;

beforeEach(() => {
  featureMap = { PNG: true, csv: true, csv_searchsource: true, printable_pdf: true };
});

test('Model of job status and status-by-pdf-app', () => {
  const result = decorateRangeStats(
    {
      status: { completed: 0, processing: 1, pending: 2, failed: 3 },
      statuses: {
        processing: { printable_pdf: { 'canvas workpad': 1 } },
        pending: { printable_pdf: { dashboard: 1, 'canvas workpad': 1 } },
        failed: { printable_pdf: { visualization: 2, dashboard: 2, 'canvas workpad': 1 } },
      },
    },
    featureMap
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
  const result = decorateRangeStats(
    {
      PNG: { available: true, total: 3 },
      printable_pdf: {
        available: true,
        total: 3,
        app: { dashboard: 0, visualization: 0, 'canvas workpad': 3 },
        layout: { preserve_layout: 3, print: 0 },
      },
      csv_searchsource: { available: true, total: 3 },
    },
    featureMap
  );

  expect(result.PNG).toMatchInlineSnapshot(`
    Object {
      "available": true,
      "deprecated": 0,
      "total": 3,
    }
  `);
  expect(result.csv).toMatchInlineSnapshot(`
    Object {
      "available": true,
      "deprecated": 0,
      "total": 0,
    }
  `);
  expect(result.csv_searchsource).toMatchInlineSnapshot(`
    Object {
      "available": true,
      "deprecated": 0,
      "total": 3,
    }
  `);
  expect(result.printable_pdf).toMatchInlineSnapshot(`
    Object {
      "app": Object {
        "canvas workpad": 3,
        "dashboard": 0,
        "visualization": 0,
      },
      "available": true,
      "deprecated": 0,
      "layout": Object {
        "preserve_layout": 3,
        "print": 0,
      },
      "total": 3,
    }
  `);
});

test('PNG counts, provided count of deprecated jobs explicitly', () => {
  const result = decorateRangeStats(
    { PNG: { available: true, total: 15, deprecated: 5 } },
    featureMap
  );
  expect(result.PNG).toMatchInlineSnapshot(`
    Object {
      "available": true,
      "deprecated": 5,
      "total": 15,
    }
  `);
});

test('CSV counts, provides all jobs implicitly deprecated due to jobtype', () => {
  const result = decorateRangeStats(
    { csv: { available: true, total: 15, deprecated: 0 } },
    featureMap
  );
  expect(result.csv).toMatchInlineSnapshot(`
    Object {
      "available": true,
      "deprecated": 15,
      "total": 15,
    }
  `);
});
