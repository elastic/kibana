/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../lib/generate_pdf', () => ({ generatePdfObservableFactory: jest.fn() }));

import * as Rx from 'rxjs';
import { ReportingCore } from '../../../';
import { CancellationToken } from '../../../../common';
import { cryptoFactory, LevelLogger } from '../../../lib';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockReportingCore,
} from '../../../test_helpers';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { TaskPayloadPDF } from '../types';
import { runTaskFnFactory } from './';

let mockReporting: ReportingCore;

const cancellationToken = ({
  on: jest.fn(),
} as unknown) as CancellationToken;

const mockLoggerFactory = {
  get: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
};
const getMockLogger = () => new LevelLogger(mockLoggerFactory);

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPDF;

beforeEach(async () => {
  const reportingConfig = {
    'server.basePath': '/sbp',
    index: '.reports-test',
    encryptionKey: mockEncryptionKey,
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
  };
  const mockSchema = createMockConfigSchema(reportingConfig);
  const mockReportingConfig = createMockConfig(mockSchema);

  mockReporting = await createMockReportingCore(mockReportingConfig);

  const mockElasticsearch = {
    legacy: {
      client: {
        asScoped: () => ({ callAsCurrentUser: jest.fn() }),
      },
    },
  };
  const mockGetElasticsearch = jest.fn();
  mockGetElasticsearch.mockImplementation(() => Promise.resolve(mockElasticsearch));
  mockReporting.getElasticsearchService = mockGetElasticsearch;
  // @ts-ignore over-riding config
  mockReporting.config = mockReportingConfig;

  (generatePdfObservableFactory as jest.Mock).mockReturnValue(jest.fn());
});

afterEach(() => (generatePdfObservableFactory as jest.Mock).mockReset());

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  const generatePdfObservable = (await generatePdfObservableFactory(mockReporting)) as jest.Mock;
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const browserTimezone = 'UTC';
  await runTask(
    'pdfJobId',
    getBasePayload({
      title: 'PDF Params Timezone Test',
      relativeUrl: '/app/kibana#/something',
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken
  );

  const tzParam = generatePdfObservable.mock.calls[0][3];
  expect(tzParam).toBe('UTC');
});

test(`returns content_type of application/pdf`, async () => {
  const logger = getMockLogger();
  const runTask = runTaskFnFactory(mockReporting, logger);
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = await generatePdfObservableFactory(mockReporting);
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await runTask(
    'pdfJobId',
    getBasePayload({ relativeUrls: [], headers: encryptedHeaders }),
    cancellationToken
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';
  const generatePdfObservable = await generatePdfObservableFactory(mockReporting);
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await runTask(
    'pdfJobId',
    getBasePayload({ relativeUrls: [], headers: encryptedHeaders }),
    cancellationToken
  );

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
