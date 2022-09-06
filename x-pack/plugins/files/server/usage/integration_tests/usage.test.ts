/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../../test_utils';

describe('Files usage telemetry', () => {
  let testHarness: TestEnvironmentUtils;
  let createFile: TestEnvironmentUtils['createFile'];
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let fileKind: TestEnvironmentUtils['fileKind'];

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ createFile, root, request, fileKind } = testHarness);
  });

  beforeEach(async () => {
    await testHarness.cleanupAfterEach();
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  it('creates an object with the expected values', async () => {
    const file1 = await createFile();
    const file2 = await createFile();
    const file3 = await createFile();

    await request
      .put(root, `/api/files/files/${fileKind}/${file1.id}/blob`)
      .set('Content-Type', 'application/octet-stream')
      .send('what have you')
      .expect(200);

    await Promise.all([
      request.post(root, `/api/files/shares/${fileKind}/${file2.id}`).send({}).expect(200),
      request.post(root, `/api/files/shares/${fileKind}/${file3.id}`).send({}).expect(200),
    ]);

    const { body } = await request.get(root, `/api/stats?extended=true&legacy=true`);

    expect(body.usage.files).toMatchInlineSnapshot(`
      Object {
        "avg_size": 13,
        "bytes_used": 13,
        "count": 3,
        "file_kind_breakdown": Array [
          Object {
            "avg_size": 13,
            "count": 3,
            "kind": "test-file-kind",
          },
        ],
        "share_count": 2,
        "status_breakdown": Object {
          "AWAITING_UPLOAD": Object {
            "avg_size": null,
            "count": 2,
          },
          "READY": Object {
            "avg_size": 13,
            "count": 1,
          },
        },
      }
    `);
  });
});
