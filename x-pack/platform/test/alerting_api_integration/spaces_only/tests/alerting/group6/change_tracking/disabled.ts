/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function changeTrackingDisabledTest({ getService }: FtrProviderContext) {
  const es = getService('es');

  describe('change tracking service - disabled (default)', () => {
    it('should not create the change history data stream when ruleChangeTracking is disabled', async () => {
      // Wait long enough for any async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      const response = await es.indices.getDataStream(
        { name: '.kibana-change-history' },
        { ignore: [404] }
      );
      expect(response.data_streams?.length ?? 0).to.equal(0);
    });
  });
}
