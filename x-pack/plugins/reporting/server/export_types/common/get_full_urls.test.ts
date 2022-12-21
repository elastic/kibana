/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingConfig } from '../..';
import { createMockConfig } from '../../test_helpers';
import { TaskPayloadPNG } from '../png/types';
import { TaskPayloadPDF } from '../printable_pdf/types';
import { getFullUrls } from './get_full_urls';

let mockConfig: ReportingConfig;

beforeEach(() => {
  const reportingConfig: Record<string, any> = {
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
    'server.basePath': '/sbp',
  };
  mockConfig = createMockConfig(reportingConfig);
});

const getMockJob = (base: object) => base as TaskPayloadPNG & TaskPayloadPDF;

test(`fails if no URL is passed`, async () => {
  const fn = () => getFullUrls(mockConfig, getMockJob({}));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\`"`
  );
});

test(`fails if URLs are file-protocols for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  const fn = () => getFullUrls(mockConfig, getMockJob({ relativeUrl, forceNow }));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: file://etc/passwd/#/something"`
  );
});

test(`fails if URLs are absolute for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  const fn = () => getFullUrls(mockConfig, getMockJob({ relativeUrl, forceNow }));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something"`
  );
});

test(`fails if URLs are file-protocols for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  const fn = () => getFullUrls(mockConfig, getMockJob({ objects: [{ relativeUrl }], forceNow }));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: file://etc/passwd/#/something"`
  );
});

test(`fails if URLs are absolute for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  const fn = () =>
    getFullUrls(
      mockConfig,
      getMockJob({
        objects: [{ relativeUrl }],
        forceNow,
      })
    );
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something"`
  );
});

test(`fails if any URLs are absolute or file's for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const objects = [
    { relativeUrl: '/app/kibana#/something_aaa' },
    {
      relativeUrl:
        'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something',
    },
    { relativeUrl: 'file://etc/passwd/#/something' },
  ];

  const fn = () => getFullUrls(mockConfig, getMockJob({ objects, forceNow }));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"Found invalid URL(s), all URLs must be relative: http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something file://etc/passwd/#/something"`
  );
});

test(`fails if URL does not route to a visualization`, async () => {
  const fn = () => getFullUrls(mockConfig, getMockJob({ relativeUrl: '/app/phoney' }));
  expect(fn).toThrowErrorMatchingInlineSnapshot(
    `"No valid hash in the URL! A hash is expected for the application to route to the intended visualization."`
  );
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const urls = getFullUrls(
    mockConfig,
    getMockJob({ relativeUrl: '/app/kibana#/something', forceNow })
  );

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';

  const urls = getFullUrls(
    mockConfig,
    getMockJob({ relativeUrl: '/app/kibana#/something?_g=something', forceNow })
  );

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const urls = getFullUrls(mockConfig, getMockJob({ relativeUrl: '/app/kibana#/something' }));

  expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');
});

test(`adds forceNow to each of multiple urls`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const urls = getFullUrls(
    mockConfig,
    getMockJob({
      objects: [
        { relativeUrl: '/app/kibana#/something_aaa' },
        { relativeUrl: '/app/kibana#/something_bbb' },
        { relativeUrl: '/app/kibana#/something_ccc' },
        { relativeUrl: '/app/kibana#/something_ddd' },
      ],
      forceNow,
    })
  );

  expect(urls).toEqual([
    'http://localhost:5601/sbp/app/kibana#/something_aaa?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_bbb?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ccc?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ddd?forceNow=2000-01-01T00%3A00%3A00.000Z',
  ]);
});
