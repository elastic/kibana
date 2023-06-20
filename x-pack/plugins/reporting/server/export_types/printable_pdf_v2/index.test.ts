/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./lib/generate_pdf');

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import { TaskPayloadPDFV2 } from '../../../common/types/export_types/printable_pdf_v2';
import { Writable } from 'stream';
import { cryptoFactory } from '../../lib';
import { generatePdfObservable } from './lib/generate_pdf';
import * as Rx from 'rxjs';
import { LocatorParams } from '../../../common';
import { PdfExportType } from '.';
import { createMockConfigSchema } from '../../test_helpers';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

let content: string;
let stream: jest.Mocked<Writable>;

const cancellationToken = {
  on: jest.fn(),
} as unknown as CancellationToken;

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) =>
  ({
    params: { forceNow: 'test' },
    ...baseObj,
  } as TaskPayloadPDFV2);

const configType = createMockConfigSchema({ encryptionKey: mockEncryptionKey });
const mockCoreSetup = coreMock.createSetup();
const mockLogger = loggingSystemMock.createLogger();
const mockPdfExportType = new PdfExportType(
  mockCoreSetup,
  configType,
  mockLogger,
  coreMock.createPluginInitializerContext(configType)
);

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of(Buffer.from('')));
  (mockPdfExportType.getSpaceId as jest.Mock).mockReturnValue(DEFAULT_SPACE_ID);

  const browserTimezone = 'UTC';
  await mockPdfExportType.runTask(
    getBasePayload({
      forceNow: 'test',
      title: 'PDF Params Timezone Test',
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      browserTimezone,
      headers: encryptedHeaders,
    }),
    'pdfJobId',
    cancellationToken,
    stream
  );

  expect(generatePdfObservable).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.objectContaining({ browserTimezone: 'UTC' })
  );
});

test(`returns content_type of application/pdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const { content_type: contentType } = await mockPdfExportType.runTask(
    getBasePayload({ locatorParams: [], headers: encryptedHeaders }),
    'pdfJobId',
    cancellationToken,
    stream
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const encryptedHeaders = await encryptHeaders({});
  await mockPdfExportType.runTask(
    getBasePayload({ locatorParams: [], headers: encryptedHeaders }),
    'pdfJobId',
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
