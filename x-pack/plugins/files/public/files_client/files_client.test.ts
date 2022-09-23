/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiRoutes } from './files_client';

describe('apiRoutes', () => {
  test('generates expected paths', () => {
    expect(apiRoutes.getCreateFileRoute('test')).toMatchInlineSnapshot(`"/api/files/files/test"`);

    expect(apiRoutes.getUploadRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123/blob"`
    );

    expect(apiRoutes.getDownloadRoute('test', '123', 'my-file.png')).toMatchInlineSnapshot(
      `"/api/files/files/test/123/blob/my-file.png"`
    );

    expect(apiRoutes.getUpdateRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getDeleteRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getListRoute('test', 1, 1)).toMatchInlineSnapshot(
      `"/api/files/files/test/list?page=1&perPage=1"`
    );

    expect(apiRoutes.getByIdRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/files/test/123"`
    );

    expect(apiRoutes.getShareRoute('test', '123')).toMatchInlineSnapshot(
      `"/api/files/shares/test/123"`
    );

    expect(apiRoutes.getListSharesRoute('test', 1, 1)).toMatchInlineSnapshot(
      `"/api/files/shares/test?page=1&perPage=1"`
    );

    expect(apiRoutes.getPublicDownloadRoute('test', 'my-file.pdf')).toMatchInlineSnapshot(
      `"/api/files/public/blob/my-file.pdf?token=test"`
    );

    expect(apiRoutes.getFindRoute(1, 1)).toMatchInlineSnapshot(
      `"/api/files/find?page=1&perPage=1"`
    );

    expect(apiRoutes.getMetricsRoute()).toMatchInlineSnapshot(`"/api/files/metrics"`);
  });
});
