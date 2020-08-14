/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ReportingConfig } from '../../';
import { ReportingCore } from '../../core';
import { createMockReportingCore } from '../../test_helpers';
import { ScheduledTaskParams } from '../../types';
import { ScheduledTaskParamsPDF } from '../printable_pdf/types';
import { getConditionalHeaders, getCustomLogo } from './';

let mockConfig: ReportingConfig;
let mockReportingPlugin: ReportingCore;

const getMockConfig = (mockConfigGet: sinon.SinonStub) => ({
  get: mockConfigGet,
  kbnConfig: { get: mockConfigGet },
});

beforeEach(async () => {
  const mockConfigGet = sinon
    .stub()
    .withArgs('kibanaServer', 'hostname')
    .returns('custom-hostname');
  mockConfig = getMockConfig(mockConfigGet);
  mockReportingPlugin = await createMockReportingCore(mockConfig);
});

describe('conditions', () => {
  test(`uses hostname from reporting config if set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as ScheduledTaskParams<any>,
      filteredHeaders: permittedHeaders,
      config: mockConfig,
    });

    expect(conditionalHeaders.conditions.hostname).toEqual(
      mockConfig.get('kibanaServer', 'hostname')
    );
    expect(conditionalHeaders.conditions.port).toEqual(mockConfig.get('kibanaServer', 'port'));
    expect(conditionalHeaders.conditions.protocol).toEqual(
      mockConfig.get('kibanaServer', 'protocol')
    );
    expect(conditionalHeaders.conditions.basePath).toEqual(
      mockConfig.kbnConfig.get('server', 'basePath')
    );
  });
});

test('uses basePath from job when creating saved object service', async () => {
  const mockGetSavedObjectsClient = jest.fn();
  mockReportingPlugin.getSavedObjectsClient = mockGetSavedObjectsClient;

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };
  const conditionalHeaders = await getConditionalHeaders({
    job: {} as ScheduledTaskParams<any>,
    filteredHeaders: permittedHeaders,
    config: mockConfig,
  });
  const jobBasePath = '/sbp/s/marketing';
  await getCustomLogo({
    reporting: mockReportingPlugin,
    job: { basePath: jobBasePath } as ScheduledTaskParamsPDF,
    conditionalHeaders,
    config: mockConfig,
  });

  const getBasePath = mockGetSavedObjectsClient.mock.calls[0][0].getBasePath;
  expect(getBasePath()).toBe(jobBasePath);
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const mockGetSavedObjectsClient = jest.fn();
  mockReportingPlugin.getSavedObjectsClient = mockGetSavedObjectsClient;

  const mockConfigGet = sinon.stub();
  mockConfigGet.withArgs('kibanaServer', 'hostname').returns('localhost');
  mockConfigGet.withArgs('server', 'basePath').returns('/sbp');
  mockConfig = getMockConfig(mockConfigGet);

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };
  const conditionalHeaders = await getConditionalHeaders({
    job: {} as ScheduledTaskParams<any>,
    filteredHeaders: permittedHeaders,
    config: mockConfig,
  });

  await getCustomLogo({
    reporting: mockReportingPlugin,
    job: {} as ScheduledTaskParamsPDF,
    conditionalHeaders,
    config: mockConfig,
  });

  const getBasePath = mockGetSavedObjectsClient.mock.calls[0][0].getBasePath;
  expect(getBasePath()).toBe(`/sbp`);
  expect(mockGetSavedObjectsClient.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "getBasePath": [Function],
        "headers": Object {
          "baz": "quix",
          "foo": "bar",
        },
        "path": "/",
        "raw": Object {
          "req": Object {
            "url": "/",
          },
        },
        "route": Object {
          "settings": Object {},
        },
        "url": Object {
          "href": "/",
        },
      },
    ]
  `);
});

describe('config formatting', () => {
  test(`lowercases server.host`, async () => {
    const mockConfigGet = sinon.stub().withArgs('server', 'host').returns('COOL-HOSTNAME');
    mockConfig = getMockConfig(mockConfigGet);

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as ScheduledTaskParams<any>,
      filteredHeaders: {},
      config: mockConfig,
    });
    expect(conditionalHeaders.conditions.hostname).toEqual('cool-hostname');
  });

  test(`lowercases kibanaServer.hostname`, async () => {
    const mockConfigGet = sinon
      .stub()
      .withArgs('kibanaServer', 'hostname')
      .returns('GREAT-HOSTNAME');
    mockConfig = getMockConfig(mockConfigGet);
    const conditionalHeaders = await getConditionalHeaders({
      job: {
        title: 'cool-job-bro',
        type: 'csv',
        jobParams: {
          savedObjectId: 'abc-123',
          isImmediate: false,
          savedObjectType: 'search',
        },
      },
      filteredHeaders: {},
      config: mockConfig,
    });
    expect(conditionalHeaders.conditions.hostname).toEqual('great-hostname');
  });
});
