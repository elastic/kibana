/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const SUB_FEATURE_DESC_PREFIX = 'Includes: ';

export default function subFeatureDescriptionsTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('sub feature descriptions', () => {
    it('should have each connector in a sub feature description', async () => {
      const { body: features } = await supertest.get('/api/features').expect(200);
      expect(Array.isArray(features)).to.be(true);
      const actionsFeature = features.find((o: any) => o.id === 'actions');
      expect(!!actionsFeature).to.be(true);

      const connectorTitles = [];
      for (const subFeature of actionsFeature.subFeatures) {
        expect(subFeature.description.indexOf(SUB_FEATURE_DESC_PREFIX)).to.be(0);
        connectorTitles.push(
          ...subFeature.description.substring(SUB_FEATURE_DESC_PREFIX.length).split(', ')
        );
      }

      const { body: connectorTypes } = await supertest
        .get('/api/actions/connector_types')
        .expect(200);
      for (const connectorType of connectorTypes) {
        if (connectorType.sub_feature && !connectorTitles.includes(connectorType.name)) {
          throw new Error(
            `Connector type "${connectorType.name}" is not included in any of the "Actions & Connectors" sub-feature descriptions. Each new connector type must be manually added to the relevant sub-features. Please update the sub-feature descriptions in "x-pack/plugins/actions/server/feature.ts" to include "${connectorType.name}" to make this test pass.`
          );
        }
      }
      for (const connectorTitle of connectorTitles) {
        if (!connectorTypes.find((o: any) => o.name === connectorTitle)) {
          throw new Error(
            `Connector type "${connectorTitle}" is included in the "Actions & Connectors" sub-feature descriptions but not registered as a connector type. Please update the sub-feature descriptions in "x-pack/plugins/actions/server/feature.ts" to remove "${connectorTitle}" to make this test pass.`
          );
        }
      }
    });
  });
}
