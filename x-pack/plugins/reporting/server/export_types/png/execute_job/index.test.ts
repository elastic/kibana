/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'stream';
import * as Rx from 'rxjs';
import { ReportingCore } from '../../../';
import { CancellationToken } from '../../../../common';
import { cryptoFactory, LevelLogger } from '../../../lib';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockReportingCore,
} from '../../../test_helpers';
import { generatePngObservableFactory } from '../../common';
import { TaskPayloadPNG } from '../types';
import { runTaskFnFactory } from './';

jest.mock('../../common/generate_png', () => ({ generatePngObservableFactory: jest.fn() }));

let content: string;
let mockReporting: ReportingCore;
let stream: jest.Mocked<Writable>;

const cancellationToken = {
  on: jest.fn(),
} as unknown as CancellationToken;

const mockLoggerFactory = {
  get: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
};
const getMockLogger = () => new LevelLogger(mockLoggerFactory);

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
    index: '.reporting-2018.10.10',
    encryptionKey: mockEncryptionKey,
    queue: {
      indexInterval: 'daily',
      timeout: Infinity,
    },
  });

  mockReporting = await createMockReportingCore(mockReportingConfig);
  mockReporting.setConfig(createMockConfig(mockReportingConfig));

  (generatePngObservableFactory as jest.Mock).mockReturnValue(jest.fn());
});

afterEach(() => (generatePngObservableFactory as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  const generatePngObservable = (await generatePngObservableFactory(mockReporting)) as jest.Mock;
  generatePngObservable.mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const runTask = await runTaskFnFactory(mockReporting, getMockLogger());
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

  expect(generatePngObservable.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        LevelLogger {
          "_logger": Object {
            "get": [MockFunction],
          },
          "_tags": Array [
            "PNG",
            "execute",
            "pngJobId",
          ],
          "warning": [Function],
        },
        "localhost:80undefined/app/kibana#/something",
        "UTC",
        Object {
          "conditions": Object {
            "basePath": undefined,
            "hostname": "localhost",
            "port": 80,
            "protocol": undefined,
          },
          "headers": Object {},
        },
        undefined,
      ],
    ]
  `);
});

test(`returns content_type of application/png`, async () => {
  const runTask = await runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = await generatePngObservableFactory(mockReporting);
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
  const generatePngObservable = await generatePngObservableFactory(mockReporting);
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const runTask = await runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  await runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
