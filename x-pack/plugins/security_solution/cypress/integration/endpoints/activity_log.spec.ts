/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../../tasks/login';

import { ENDPOINTS_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import { LIST_PAGE_TITLE } from '../../screens/endpoints/list';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

const toggleData = (isTeardown = false) => {
  const dummyDataList = [
    'policies',
    'policies_saved_objects',
    'endpoint_integration_saved_objects',
    'agents',
    'metadata',
  ];
  dummyDataList.forEach((e) => (isTeardown ? esArchiverUnload(e) : esArchiverLoad(e)));
};

describe('Activity Log', () => {
  context('Rendered', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(ENDPOINTS_URL);

      toggleData();
    });

    after(() => {
      toggleData(true);
    });

    it('displays the endpoints list page', () => {
      cy.get(LIST_PAGE_TITLE).should('have.text', 'Endpoints');
      cy.get('[data-test-subj="hostnameCellLink"]').click();
      cy.get('[data-test-subj="activity_log"]').click();
    });
  });
});
