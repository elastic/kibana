/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const settingsPath = '/app/management/kibana/settings';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

describe('Maximum number service setting', () => {
  const maxNumServices =
    '[data-test-subj="advancedSetting-editField-observability:maxNumServices"]';

  before(async () => {
    await synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsPowerUser();
  });

  describe('when updating the maximum number of services', () => {
    it('updates the configuration in advanced kibana setting', () => {
      cy.visit(settingsPath);

      cy.get(maxNumServices).clear();
      cy.get(maxNumServices).type('{uparrow}');
      cy.contains('Save changes').should('not.be.disabled');
      cy.contains('Save changes').click();
    });

    it('displays only 1 service in service overview page', () => {
      cy.visit(
        url.format({
          pathname: '/app/apm/services/',
          query: { rangeFrom: start, rangeTo: end },
        })
      );

      cy.contains('opbeans-node');
      cy.get('tr').eq(1);
    });
  });
});
