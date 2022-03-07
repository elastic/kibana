/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { loggingSystemMock } from 'src/core/server/mocks';
import { Writable } from 'stream';
import { ReportingCore } from '../../../';
import { CancellationToken } from '../../../../common/cancellation_token';
import { cryptoFactory } from '../../../lib';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockReportingCore,
} from '../../../test_helpers';
import { generatePngObservable } from '../../common';
import { TaskPayloadPNG } from '../types';
import { runTaskFnFactory } from './';

jest.mock('../../common/generate_png');

let content: string;
let mockReporting: ReportingCore;
let stream: jest.Mocked<Writable>;

const cancellationToken = {
  on: jest.fn(),
} as unknown as CancellationToken;

const getMockLogger = () => loggingSystemMock.createLogger();

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPNG;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const mockReportingConfig = createMockConfigSchema({
    encryptionKey: mockEncryptionKey,
    queue: {
      indexInterval: 'daily',
      timeout: Infinity,
    },
  });

  mockReporting = await createMockReportingCore(mockReportingConfig);
  mockReporting.setConfig(createMockConfig(mockReportingConfig));
});

afterEach(() => (generatePngObservable as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const browserTimezone = 'UTC';
  await runTask(
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
      urls: ['localhost:80undefined/app/kibana#/something'],
      browserTimezone: 'UTC',
      headers: {},
    })
  );
});

test(`returns content_type of application/png`, async () => {
  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});

  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('foo') }));

  const { content_type: contentType } = await runTask(
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

  const runTask = runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  await runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
