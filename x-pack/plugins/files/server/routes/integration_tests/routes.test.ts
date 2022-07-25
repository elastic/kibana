/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateFileKindHttpEndpoint } from '../../../common/api_routes';
import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../tests';

describe('File HTTP API', () => {
  let testHarness: TestEnvironmentUtils;
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let createFile: TestEnvironmentUtils['createFile'];
  let fileKind: string;

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ request, createFile, root, fileKind } = testHarness);
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  describe('find', () => {
    beforeEach(async () => {
      const args: Array<CreateFileKindHttpEndpoint['inputs']['body']> = [
        {
          name: 'firstFile',
          alt: 'my first alt',
          meta: {
            cool: 'beans',
          },
          mimeType: 'image/png',
        },
        {
          name: 'secondFile',
          alt: 'my second alt',
          meta: {
            other: 'beans',
          },
          mimeType: 'application/pdf',
        },
        {
          name: 'thirdFile',
          alt: 'my first alt',
          meta: {
            cool: 'bones',
          },
          mimeType: 'image/png',
        },
      ];

      const files = await Promise.all(args.map((arg) => createFile(arg)));

      for (const file of files.slice(0, 2)) {
        await request
          .put(root, `/api/files/files/${testHarness.fileKind}/${file.id}/blob`)
          .set('Content-Type', 'application/octet-stream')
          .send('hello world')
          .expect(200);
      }
    });
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });

    test('without filters', async () => {
      const result = await request.post(root, '/api/files/files/find').send({}).expect(200);
      expect(result.body.files).toHaveLength(3);
    });

    test('names', async () => {
      const result = await request
        .post(root, '/api/files/files/find')
        .send({ name: ['firstFile', 'secondFile'] })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('file kind', async () => {
      {
        const result = await request
          .post(root, `/api/files/files/find`)
          .send({ kind: 'non-existent' })
          .expect(200);
        expect(result.body.files).toHaveLength(0);
      }

      {
        const result = await request
          .post(root, '/api/files/files/find')
          .send({ kind: testHarness.fileKind })
          .expect(200);
        expect(result.body.files).toHaveLength(3);
      }
    });

    test('status', async () => {
      const result = await request
        .post(root, '/api/files/files/find')
        .send({
          status: 'READY',
        })
        .expect(200);
      expect(result.body.files).toHaveLength(2);
    });

    test('combination', async () => {
      const result = await request
        .post(root, '/api/files/files/find')
        .send({
          kind: testHarness.fileKind,
          name: ['firstFile', 'secondFile'],
          meta: { cool: 'beans' },
        })
        .expect(200);
      expect(result.body.files).toHaveLength(1);
    });
  });

  describe('metrics', () => {
    const esMaxCapacity = 50 * 1024 * 1024;
    afterEach(async () => {
      await testHarness.cleanupAfterEach();
    });
    test('returns usage metrics', async () => {
      {
        const { body: metrics } = await request.get(root, '/api/files/files/metrics').expect(200);
        expect(metrics).toEqual({
          countByExtension: {},
          countByStatus: {},
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: esMaxCapacity,
              used: 0,
            },
          },
        });
      }

      const [file1, file2] = await Promise.all([createFile(), createFile(), createFile()]);

      {
        const { body: metrics } = await request.get(root, '/api/files/files/metrics').expect(200);
        expect(metrics).toEqual({
          countByExtension: {
            png: 3,
          },
          countByStatus: {
            AWAITING_UPLOAD: 3,
          },
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: esMaxCapacity,
              used: 0,
            },
          },
        });
      }

      await request
        .put(root, `/api/files/files/${fileKind}/${file1.id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .send('what have you')
        .expect(200);
      await request
        .put(root, `/api/files/files/${fileKind}/${file2.id}/blob`)
        .set('Content-Type', 'application/octet-stream')
        .send('what have you')
        .expect(200);

      {
        const { body: metrics } = await request.get(root, '/api/files/files/metrics').expect(200);
        expect(metrics).toEqual({
          countByExtension: {
            png: 3,
          },
          countByStatus: {
            AWAITING_UPLOAD: 1,
            READY: 2,
          },
          storage: {
            esFixedSizeIndex: {
              capacity: esMaxCapacity,
              available: 52428774,
              used: 26,
            },
          },
        });
      }
    });
  });
});
