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

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ request, createFile, root } = testHarness);
  });

  afterAll(async () => {
    testHarness.cleanupAfterAll();
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
});
