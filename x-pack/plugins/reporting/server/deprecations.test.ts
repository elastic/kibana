/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '.';
import { registerDeprecations } from './deprecations';
import { createMockConfigSchema, createMockReportingCore } from './test_helpers';
import { coreMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { GetDeprecationsContext, IScopedClusterClient } from 'kibana/server';

let reportingCore: ReportingCore;
let context: GetDeprecationsContext;
let esClient: jest.Mocked<IScopedClusterClient>;

beforeEach(async () => {
  const mockReportingConfig = createMockConfigSchema({ roles: { enabled: false } });
  reportingCore = await createMockReportingCore(mockReportingConfig);
  esClient = elasticsearchServiceMock.createScopedClusterClient();
  esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
    body: { xyz: { username: 'normal_user', roles: ['data_analyst'] } },
  });
  context = ({ esClient } as unknown) as GetDeprecationsContext;
});

test('logs no deprecations when setup has no issues', async () => {
  const { getDeprecations } = await registerDeprecations(reportingCore, coreMock.createSetup());
  expect(await getDeprecations(context)).toMatchInlineSnapshot(`Array []`);
});

test('logs a plain message when only a reporting_user role issue is found', async () => {
  esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
    body: { reportron: { username: 'reportron', roles: ['kibana_admin', 'reporting_user'] } },
  });

  const { getDeprecations } = await registerDeprecations(reportingCore, coreMock.createSetup());
  expect(await getDeprecations(context)).toMatchInlineSnapshot(`
    Array [
      Object {
        "correctiveActions": Object {
          "manualSteps": Array [
            "Create one or more custom roles that provide Kibana application privileges to reporting features in **Management > Security > Roles**.",
            "Assign the custom role(s) as desired, and remove the \\"reporting_user\\" role from the user(s).",
          ],
        },
        "documentationUrl": "https://www.elastic.co/guide/en/kibana/current/secure-reporting.html",
        "level": "critical",
        "message": "The deprecated \\"reporting_user\\" role has been found for 1 user(s): \\"reportron\\"",
      },
    ]
  `);
});

test('logs multiple entries when multiple reporting_user role issues are found', async () => {
  esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
    body: {
      reportron: { username: 'reportron', roles: ['kibana_admin', 'reporting_user'] },
      supercooluser: { username: 'supercooluser', roles: ['kibana_admin', 'reporting_user'] },
    },
  });

  const { getDeprecations } = await registerDeprecations(reportingCore, coreMock.createSetup());
  expect(await getDeprecations(context)).toMatchInlineSnapshot(`
    Array [
      Object {
        "correctiveActions": Object {
          "manualSteps": Array [
            "Create one or more custom roles that provide Kibana application privileges to reporting features in **Management > Security > Roles**.",
            "Assign the custom role(s) as desired, and remove the \\"reporting_user\\" role from the user(s).",
          ],
        },
        "documentationUrl": "https://www.elastic.co/guide/en/kibana/current/secure-reporting.html",
        "level": "critical",
        "message": "The deprecated \\"reporting_user\\" role has been found for 2 user(s): \\"reportron\\", \\"supercooluser\\"",
      },
    ]
  `);
});

test('logs an expanded message when a config issue and a reporting_user role issue is found', async () => {
  esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
    body: { reportron: { username: 'reportron', roles: ['kibana_admin', 'reporting_user'] } },
  });

  const mockReportingConfig = createMockConfigSchema({ roles: { enabled: true } });
  reportingCore = await createMockReportingCore(mockReportingConfig);

  const { getDeprecations } = await registerDeprecations(reportingCore, coreMock.createSetup());
  expect(await getDeprecations(context)).toMatchInlineSnapshot(`
    Array [
      Object {
        "correctiveActions": Object {
          "manualSteps": Array [
            "Set \\"xpack.reporting.roles.enabled: false\\" in kibana.yml",
            "Create one or more custom roles that provide Kibana application privileges to reporting features in **Management > Security > Roles**.",
            "Assign the custom role(s) as desired, and remove the \\"reporting_user\\" role from the user(s).",
          ],
        },
        "documentationUrl": "https://www.elastic.co/guide/en/kibana/current/secure-reporting.html",
        "level": "critical",
        "message": "The deprecated \\"reporting_user\\" role has been found for 1 user(s): \\"reportron\\"",
      },
    ]
  `);
});
