/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('calendars', function () {
    // TODO: Remove these FTR tests after verifying full coverage in Scout API tests
    // See: x-pack/platform/plugins/shared/ml/test/scout/api/tests/calendars/
    // FTR tests have been migrated to Scout. These can be deleted once migration is complete.
    // See related PR: https://github.com/elastic/kibana/pull/263529
    loadTestFile(require.resolve('./create_calendars'));
    loadTestFile(require.resolve('./get_calendars'));
    loadTestFile(require.resolve('./delete_calendars'));
    loadTestFile(require.resolve('./update_calendars'));
  });
}
