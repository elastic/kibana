/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');

  describe('ent-search cluster', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/ent_search/with_es', {
        from: 'Oct 15, 2021 @ 14:00:00.000',
        to: 'Oct 15, 2021 @ 22:00:00.000',
      });

      await overview.closeAlertsModal();
    });

    after(async () => {
      await tearDown();
    });

    it('shows ent-search panel with data', async () => {
      expect(await overview.getEntSearchTotalNodes()).to.be('Nodes: 1');
      expect(await overview.getEntSearchTotalEngines()).to.be('2');
      expect(await overview.getEntSearchTotalOrgSources()).to.be('1');
    });
  });
}
