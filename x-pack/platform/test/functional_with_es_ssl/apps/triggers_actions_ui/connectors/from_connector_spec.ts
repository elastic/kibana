/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { getConnectorByName } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const actions = getService('actions');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const toasts = getService('toasts');

  describe('connector from spec', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should create a spec connector (alienvault)', async () => {
      const connectorName = 'web';

      await actions.connectorFromSpec.openCreateConnectorFlyout();
      await actions.connectorFromSpec.setConnectorFields({
        name: connectorName,
        token: 'fake-token',
      });

      await actions.connectorFromSpec.saveAndCloseFlyout();

      const toastTitle = await toasts.getTitleAndDismiss();
      expect(toastTitle).to.eql(`Created '${connectorName}'`);

      const connector = await getConnectorByName(connectorName, supertest);
      objectRemover.add(connector.id, 'connector', 'actions');
    });
  });
};
