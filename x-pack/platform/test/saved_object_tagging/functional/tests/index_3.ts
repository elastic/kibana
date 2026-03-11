/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';
import { createUsersAndRoles } from '../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('saved objects tagging - functional tests (part 3)', function () {
    before(async () => {
      await createUsersAndRoles(getService);
    });

    loadTestFile(require.resolve('./maps_integration'));
    loadTestFile(require.resolve('./discover_integration'));
  });
}
