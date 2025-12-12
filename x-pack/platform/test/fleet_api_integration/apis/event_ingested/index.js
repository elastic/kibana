/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from '../test_users';

export default function loadTests({ loadTestFile, getService }) {
  describe('Event Ingested', () => {
    before(async () => {
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./use_event_ingested'));
  });
}
