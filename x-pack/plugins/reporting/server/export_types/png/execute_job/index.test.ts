/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { ReportingCore } from '../../../';
import { CancellationToken } from '../../../../common';
import { cryptoFactory, LevelLogger } from '../../../lib';
import { createMockReportingCore } from '../../../test_helpers';
import { generatePngObservableFactory } from '../lib/generate_png';
import { TaskPayloadPNG } from '../types';
import { runTaskFnFactory } from './';

jest.mock('../lib/generate_png', () => ({ generatePngObservableFactory: jest.fn() }));

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

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPNG;

beforeEach(async () => {
  const kbnConfig = {
    'server.basePath': '/sbp',
  };
  const reportingConfig = {
    index: '.reporting-2018.10.10',
    encryptionKey: mockEncryptionKey,
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
    'queue.indexInterval': 'daily',
    'queue.timeout': Infinity,
  };
  const mockReportingConfig = {
    get: (...keys: string[]) => (reportingConfig as any)[keys.join('.')],
    kbnConfig: { get: (...keys: string[]) => (kbnConfig as any)[keys.join('.')] },
  };

  mockReporting = await createMockReportingCore(mockReportingConfig);

  // @ts-ignore over-riding config method
  mockReporting.config = mockReportingConfig;

  (generatePngObservableFactory as jest.Mock).mockReturnValue(jest.fn());
});

afterEach(() => (generatePngObservableFactory as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  const generatePngObservable = (await generatePngObservableFactory(mockReporting)) as jest.Mock;
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const runTask = await runTaskFnFactory(mockReporting, getMockLogger());
  const browserTimezone = 'UTC';
  await runTask(
    'pngJobId',
    getBasePayload({
      relativeUrl: '/app/kibana#/something',
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken
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
        "http://localhost:5601/sbp/app/kibana#/something",
        "UTC",
        Object {
          "conditions": Object {
            "basePath": "/sbp",
            "hostname": "localhost",
            "port": 5601,
            "protocol": "http",
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
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of('foo'));

  const { content_type: contentType } = await runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken
  );
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'raw string from get_screenhots';
  const generatePngObservable = await generatePngObservableFactory(mockReporting);
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ base64: testContent }));

  const runTask = await runTaskFnFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await runTask(
    'pngJobId',
    getBasePayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken
  );

  expect(content).toEqual(testContent);
});
