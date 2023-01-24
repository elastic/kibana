/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Writable } from 'stream';
import { ReportingCore } from '../../..';
import { CancellationToken } from '../../../../common/cancellation_token';
import { cryptoFactory } from '../../../lib';
import { createMockConfigSchema, createMockReportingCore } from '../../../test_helpers';
import { generatePdfObservable } from '../lib/generate_pdf';
import { TaskPayloadPDF } from '../types';
import { runTaskFnFactory } from '.';

jest.mock('../lib/generate_pdf');

let content: string;
let mockReporting: ReportingCore;
let stream: jest.Mocked<Writable>;

const cancellationToken = {
  on: jest.fn(),
} as unknown as CancellationToken;

const getMockLogger = () => loggingSystemMock.createLogger();

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPDF;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const reportingConfig = {
    'server.basePath': '/sbp',
    index: '.reports-test',
    encryptionKey: mockEncryptionKey,
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
  };
  const mockSchema = createMockConfigSchema(reportingConfig);
  mockReporting = await createMockReportingCore(mockSchema);
});

afterEach(() => (generatePdfObservable as jest.Mock).mockReset());

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

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
    cancellationToken,
    stream
  );

  expect(generatePdfObservable).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ browserTimezone: 'UTC' })
  );
});

test(`returns content_type of application/pdf`, async () => {
  const logger = getMockLogger();
  const runTask = runTaskFnFactory(mockReporting, logger);
  const encryptedHeaders = await encryptHeaders({});

  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const { content_type: contentType } = await runTask(
    'pdfJobId',
    getBasePayload({ objects: [], headers: encryptedHeaders }),
    cancellationToken,
    stream
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  await runTask(
    'pdfJobId',
    getBasePayload({ objects: [], headers: encryptedHeaders }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
