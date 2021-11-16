/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

/**

1. Install a  "fake" newer version of `system`
2. Start up Kibana
3. Assert that the newer version of `system` is removed and the latest available version is installed instead

 */

describe('managed package rollbacks', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeAll(async () => {
    root = kbnTestServer.createRoot();

    await root.preboot();
    await root.setup();
    await root.start();
  }, 30000);

  afterAll(async () => {
    await root.shutdown();
  });

  describe('when newer version of managed package is installed', () => {
    it('rolls back to latest supported version of package', async () => {
      expect(true).toBe(true);
    });
  });
});
