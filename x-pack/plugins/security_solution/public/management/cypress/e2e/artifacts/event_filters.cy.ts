/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APP_EVENT_FILTERS_PATH } from '../../../../../common/constants';
import { removeAllArtifacts } from '../../tasks/artifacts';
import { loadPage } from '../../tasks/common';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import type { ReturnTypeFromChainable } from '../../types';

describe('Event Filters', { tags: ['@ess', '@serverless'] }, () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
  const CONDITION_FIELD_NAME = 'fieldAutocompleteComboBox';
  const CONDITION_VALUE = 'valuesAutocompleteMatch';
  const SUBMIT_BUTTON = 'EventFiltersListPage-flyout-submitButton';

  before(() => {
    indexEndpointHosts().then((indexEndpoints) => {
      endpointData = indexEndpoints;
    });
  });

  after(() => {
    removeAllArtifacts();

    endpointData?.cleanup();
    endpointData = undefined;
  });

  beforeEach(() => {
    removeAllArtifacts();
  });

  describe('when selecting condition field name', () => {
    beforeEach(() => {
      login();
      loadPage(APP_EVENT_FILTERS_PATH);
      cy.getByTestSubj('EventFiltersListPage-emptyState-addButton').click();

      cy.getByTestSubj('eventFilters-form-name-input').type('filter name');
    });

    it('should be able to select field by {down} + {enter}', () => {
      cy.getByTestSubj(CONDITION_FIELD_NAME).type('process.name');

      cy.get('body').realPress('ArrowDown').realPress('Enter');

      // Value input should be enabled after successfully selecting a field
      cy.getByTestSubj(CONDITION_VALUE).get('input').should('not.have.attr', 'disabled');

      cy.getByTestSubj(CONDITION_VALUE).type('random.exe');
      cy.get('body').realPress('Tab');

      cy.getByTestSubj(SUBMIT_BUTTON).should('not.have.attr', 'disabled');
    });

    it.skip('should be able to select field by {tab}', () => {
      cy.getByTestSubj(CONDITION_FIELD_NAME).type('process.name');

      cy.get('body').realPress('Tab');

      // Value input should be enabled after successfully selecting a field
      cy.getByTestSubj(CONDITION_VALUE).get('input').should('not.have.attr', 'disabled');

      cy.getByTestSubj(CONDITION_VALUE).type('random.exe');
      cy.get('body').realPress('Tab');

      cy.getByTestSubj(SUBMIT_BUTTON).should('not.have.attr', 'disabled');
    });
  });
});
