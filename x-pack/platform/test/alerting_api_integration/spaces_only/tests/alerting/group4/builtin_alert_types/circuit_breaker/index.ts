/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { buildUp, tearDown } from '../../../../helpers';

export default function alertingCircuitBreakerTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('circuit_breakers', () => {
    before(async () => await buildUp(getService));
    after(async () => await tearDown(getService));
    /**
     * This tests the expected behavior for a rule type that hits the alert limit in a single execution.
     */
    loadTestFile(require.resolve('./alert_limit_services'));
    /**
     * This tests the expected behavior for the active and recovered alerts generated over
     * a sequence of rule executions that hit the alert limit.
     */
    loadTestFile(require.resolve('./index_threshold_max_alerts'));
  });
}
