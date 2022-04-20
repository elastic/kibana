/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingStart } from '../../reporting/server/types';
import { getCanvasFeature } from './feature';

let mockReportingPlugin: ReportingStart;
beforeEach(() => {
  mockReportingPlugin = {
    usesUiCapabilities: () => false,
  };
});

it('Provides a feature declaration ', () => {
  expect(getCanvasFeature({ reporting: mockReportingPlugin })).toMatchInlineSnapshot(`
    Object {
      "app": Array [
        "canvas",
        "kibana",
      ],
      "catalogue": Array [
        "canvas",
      ],
      "category": Object {
        "euiIconType": "logoKibana",
        "id": "kibana",
        "label": "Analytics",
        "order": 1000,
      },
      "id": "canvas",
      "management": Object {},
      "name": "Canvas",
      "order": 300,
      "privileges": Object {
        "all": Object {
          "app": Array [
            "canvas",
            "kibana",
          ],
          "catalogue": Array [
            "canvas",
          ],
          "savedObject": Object {
            "all": Array [
              "canvas-workpad",
              "canvas-element",
            ],
            "read": Array [
              "index-pattern",
            ],
          },
          "ui": Array [
            "save",
            "show",
          ],
        },
        "read": Object {
          "app": Array [
            "canvas",
            "kibana",
          ],
          "catalogue": Array [
            "canvas",
          ],
          "savedObject": Object {
            "all": Array [],
            "read": Array [
              "index-pattern",
              "canvas-workpad",
              "canvas-element",
            ],
          },
          "ui": Array [
            "show",
          ],
        },
      },
      "subFeatures": Array [],
    }
  `);
});

it(`Calls on Reporting whether to include Generate PDF as a sub-feature`, () => {
  mockReportingPlugin = {
    usesUiCapabilities: () => true,
  };
  expect(getCanvasFeature({ reporting: mockReportingPlugin })).toMatchInlineSnapshot(`
    Object {
      "app": Array [
        "canvas",
        "kibana",
      ],
      "catalogue": Array [
        "canvas",
      ],
      "category": Object {
        "euiIconType": "logoKibana",
        "id": "kibana",
        "label": "Analytics",
        "order": 1000,
      },
      "id": "canvas",
      "management": Object {
        "insightsAndAlerting": Array [
          "reporting",
        ],
      },
      "name": "Canvas",
      "order": 300,
      "privileges": Object {
        "all": Object {
          "app": Array [
            "canvas",
            "kibana",
          ],
          "catalogue": Array [
            "canvas",
          ],
          "savedObject": Object {
            "all": Array [
              "canvas-workpad",
              "canvas-element",
            ],
            "read": Array [
              "index-pattern",
            ],
          },
          "ui": Array [
            "save",
            "show",
          ],
        },
        "read": Object {
          "app": Array [
            "canvas",
            "kibana",
          ],
          "catalogue": Array [
            "canvas",
          ],
          "savedObject": Object {
            "all": Array [],
            "read": Array [
              "index-pattern",
              "canvas-workpad",
              "canvas-element",
            ],
          },
          "ui": Array [
            "show",
          ],
        },
      },
      "subFeatures": Array [
        Object {
          "name": "Reporting",
          "privilegeGroups": Array [
            Object {
              "groupType": "independent",
              "privileges": Array [
                Object {
                  "api": Array [
                    "generateReport",
                  ],
                  "id": "generate_report",
                  "includeIn": "all",
                  "management": Object {
                    "insightsAndAlerting": Array [
                      "reporting",
                    ],
                  },
                  "minimumLicense": "gold",
                  "name": "Generate PDF reports",
                  "savedObject": Object {
                    "all": Array [],
                    "read": Array [],
                  },
                  "ui": Array [
                    "generatePdf",
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  `);
});
