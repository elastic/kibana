/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObjectRemover, getUrlPrefix } from '../../../common/lib';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { Spaces } from '../../scenarios';

const DEPRECATED_CONNECTOR_TYPE = 'test.deprecated';

export default function typeNotEnabledTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('connectorType deprecated', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle get connector request with deprecated connector type appropriately', async () => {
      const { body: ConnectorTypes } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector_types`
      );

      const deprecatedConnectorType = ConnectorTypes.find(
        (connectorType: { id: string }) => connectorType.id === DEPRECATED_CONNECTOR_TYPE
      );
      expect(deprecatedConnectorType).eql({
        id: 'test.deprecated',
        name: 'Test: Deprecated',
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: true,
        minimum_license_required: 'gold',
        supported_feature_ids: ['alerting'],
        is_system_action_type: false,
        is_deprecated: true,
        source: 'stack',
      });

      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'With deprecated Connector type',
          connector_type_id: DEPRECATED_CONNECTOR_TYPE,
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdConnector.id}`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        name: 'With deprecated Connector type',
        connector_type_id: DEPRECATED_CONNECTOR_TYPE,
        config: {},
        id: createdConnector.id,
        is_preconfigured: false,
        is_deprecated: false,
        is_system_action: false,
        is_missing_secrets: false,
        is_connector_type_deprecated: true,
      });
    });
  });
}
