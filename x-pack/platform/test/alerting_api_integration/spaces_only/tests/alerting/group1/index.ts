/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { buildUp, tearDown } from '../../helpers';

export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerting', () => {
    before(async () => await buildUp(getService));
    after(async () => await tearDown(getService));

    loadTestFile(require.resolve('./aggregate')); // 1 min
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./disable')); // 40 sec
    loadTestFile(require.resolve('./enable'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./find_internal')); // 3 min till here
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./get_alert_state'));
    loadTestFile(require.resolve('./get_alert_summary'));
    loadTestFile(require.resolve('./get_execution_log')); // + 1.5 min
    loadTestFile(require.resolve('./get_action_error_log'));
    loadTestFile(require.resolve('./get_rule_tags'));
    // 9 min
    loadTestFile(require.resolve('./rule_types'));
    loadTestFile(require.resolve('./rule_types_internal'));
    loadTestFile(require.resolve('./event_log'));
  });
}
