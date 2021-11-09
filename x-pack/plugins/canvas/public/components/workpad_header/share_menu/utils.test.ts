/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../common/lib/fetch');

import { getPdfJobParams } from './utils';
import { workpads } from '../../../../__fixtures__/workpads';

const workpadSharingData = { workpad: workpads[0], pageCount: 12 };

test('getPdfJobParams returns the correct job params for canvas layout', () => {
  const jobParams = getPdfJobParams(workpadSharingData, 'v99.99.99');
  expect(jobParams).toMatchInlineSnapshot(`
    Object {
      "layout": Object {
        "dimensions": Object {
          "height": 0,
          "width": 0,
        },
        "id": "canvas",
      },
      "locatorParams": Array [
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 1,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 2,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 3,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 4,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 5,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 6,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 7,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 8,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 9,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 10,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 11,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
        Object {
          "id": "CANVAS_APP_LOCATOR",
          "params": Object {
            "id": "base-workpad",
            "page": 12,
            "view": "workpadPDF",
          },
          "version": "v99.99.99",
        },
      ],
      "objectType": "canvas workpad",
      "title": "base workpad",
    }
  `);
});
