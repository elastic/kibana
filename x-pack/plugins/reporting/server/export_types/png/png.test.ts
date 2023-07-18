/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { Writable } from 'stream';
import { CancellationToken } from '@kbn/reporting-common';
import { cryptoFactory } from '../../lib';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { generatePngObservable } from '../common';
import { TaskPayloadPNG } from './types';
import { PngV1ExportType } from './png';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';

jest.mock('../common/generate_png');

let content: string;
let mockPngExportType: PngV1ExportType;
let stream: jest.Mocked<Writable>;

const cancellationToken = {
  on: jest.fn(),
} as unknown as CancellationToken;

const mockLogger = loggingSystemMock.createLogger();

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPNG;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const configType = createMockConfigSchema({ encryptionKey: mockEncryptionKey });
  const context = coreMock.createPluginInitializerContext(configType);

  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockReportingCore = await createMockReportingCore(createMockConfigSchema());

  mockPngExportType = new PngV1ExportType(mockCoreSetup, configType, mockLogger, context);

  mockPngExportType.setup({
    basePath: { set: jest.fn() },
  });
  mockPngExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    screenshotting: {} as unknown as ScreenshottingStart,
    reporting: mockReportingCore.getContract(),
  });
});

afterEach(() => (generatePngObservable as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const browserTimezone = 'UTC';
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      relativeUrl: '/app/kibana#/something',
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken,
    stream
  );

  expect(generatePngObservable).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      urls: ['http://localhost:80/mock-server-basepath/app/kibana#/something'],
      browserTimezone: 'UTC',
      headers: {},
    })
  );
});

test(`returns content_type of application/png`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('foo') }));

  const { content_type: contentType } = await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken,
    stream
  );
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng`, async () => {
  const testContent = 'raw string from get_screenhots';
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const encryptedHeaders = await encryptHeaders({});
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
