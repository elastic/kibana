/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig } from '../../../';
import { ScheduledTaskParamsPNG } from '../../png/types';
import { ScheduledTaskParamsPDF } from '../../printable_pdf/types';
import { getFullUrls } from './get_full_urls';

interface FullUrlsOpts {
  job: ScheduledTaskParamsPNG & ScheduledTaskParamsPDF;
  config: ReportingConfig;
}

let mockConfig: ReportingConfig;
const getMockConfig = (mockConfigGet: jest.Mock<any, any>) => {
  return {
    get: mockConfigGet,
    kbnConfig: { get: mockConfigGet },
  };
};

beforeEach(() => {
  const reportingConfig: Record<string, any> = {
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
    'server.basePath': '/sbp',
  };
  const mockConfigGet = jest.fn().mockImplementation((...keys: string[]) => {
    return reportingConfig[keys.join('.') as string];
  });
  mockConfig = getMockConfig(mockConfigGet);
});

const getMockJob = (base: object) => base as ScheduledTaskParamsPNG & ScheduledTaskParamsPDF;

test(`fails if no URL is passed`, async () => {
  const fn = () => getFullUrls({ job: getMockJob({}), config: mockConfig } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"No valid URL fields found in Job Params! Expected \`job.relativeUrl: string\` or \`job.relativeUrls: string[]\`"`
  );
});

test(`fails if URLs are file-protocols for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  const fn = () =>
    getFullUrls({
      job: getMockJob({ relativeUrl, forceNow }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: file://etc/passwd/#/something"`
  );
});

test(`fails if URLs are absolute for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  const fn = () =>
    getFullUrls({
      job: getMockJob({ relativeUrl, forceNow }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something"`
  );
});

test(`fails if URLs are file-protocols for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  const fn = () =>
    getFullUrls({
      job: getMockJob({
        relativeUrls: [relativeUrl],
        forceNow,
      }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: file://etc/passwd/#/something"`
  );
});

test(`fails if URLs are absolute for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  const fn = () =>
    getFullUrls({
      job: getMockJob({
        relativeUrls: [relativeUrl],
        forceNow,
      }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something"`
  );
});

test(`fails if any URLs are absolute or file's for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrls = [
    '/app/kibana#/something_aaa',
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something',
    'file://etc/passwd/#/something',
  ];

  const fn = () =>
    getFullUrls({
      job: getMockJob({ relativeUrls, forceNow }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something file://etc/passwd/#/something"`
  );
});

test(`fails if URL does not route to a visualization`, async () => {
  const fn = () =>
    getFullUrls({
      job: getMockJob({ relativeUrl: '/app/phoney' }),
      config: mockConfig,
    } as FullUrlsOpts);
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"No valid hash in the URL! A hash is expected for the application to route to the intended visualization."`
  );
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const urls = await getFullUrls({
    job: getMockJob({ relativeUrl: '/app/kibana#/something', forceNow }),
    config: mockConfig,
  } as FullUrlsOpts);

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';

  const urls = await getFullUrls({
    job: getMockJob({ relativeUrl: '/app/kibana#/something?_g=something', forceNow }),
    config: mockConfig,
  } as FullUrlsOpts);

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const urls = await getFullUrls({
    job: getMockJob({ relativeUrl: '/app/kibana#/something' }),
    config: mockConfig,
  } as FullUrlsOpts);

  expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');
});

test(`adds forceNow to each of multiple urls`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const urls = await getFullUrls({
    job: getMockJob({
      relativeUrls: [
        '/app/kibana#/something_aaa',
        '/app/kibana#/something_bbb',
        '/app/kibana#/something_ccc',
        '/app/kibana#/something_ddd',
      ],
      forceNow,
    }),
    config: mockConfig,
  } as FullUrlsOpts);

  expect(urls).toEqual([
    'http://localhost:5601/sbp/app/kibana#/something_aaa?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_bbb?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ccc?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ddd?forceNow=2000-01-01T00%3A00%3A00.000Z',
  ]);
});
