/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APP_EVENT_FILTERS_PATH } from '../../../../../common/constants';
import type { ArtifactsFixtureType } from '../../fixtures/artifacts_page';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import {
  createArtifactList,
  createPerPolicyArtifact,
  removeAllArtifacts,
} from '../../tasks/artifacts';
import { loadPage } from '../../tasks/common';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import type { ReturnTypeFromChainable } from '../../types';

describe('Event Filters', { tags: ['@ess', '@serverless'] }, () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;

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

  describe('when editing event filter value', () => {
    let eventFiltersMock: ArtifactsFixtureType;
    beforeEach(() => {
      login();

      eventFiltersMock = getArtifactsListTestsData().find(
        ({ tabId }) => tabId === 'eventFilters'
      ) as ArtifactsFixtureType;

      createArtifactList(eventFiltersMock.createRequestBody.list_id);
      createPerPolicyArtifact(eventFiltersMock.artifactName, eventFiltersMock.createRequestBody);

      loadPage(APP_EVENT_FILTERS_PATH);

      cy.getByTestSubj('EventFiltersListPage-card-header-actions-button').click();
      cy.getByTestSubj('EventFiltersListPage-card-cardEditAction').click();
      cy.getByTestSubj('EventFiltersListPage-flyout').should('exist');
    });

    it('should be able to modify after deleting value with {backspace}', () => {
      cy.getByTestSubj(CONDITION_VALUE).type(' {backspace}.lnk{enter}');
      cy.getByTestSubj(SUBMIT_BUTTON).click();

      cy.getByTestSubj('EventFiltersListPage-flyout').should('not.exist');
      cy.contains('notepad.exe.lnk');
    });

    it('should be able to modify without using {backspace}', () => {
      cy.getByTestSubj(CONDITION_VALUE).type('.lnk{enter}');
      cy.getByTestSubj(SUBMIT_BUTTON).click();

      cy.getByTestSubj('EventFiltersListPage-flyout').should('not.exist');
      cy.contains('notepad.exe.lnk');
    });

    it('should show suggestions when filter value is cleared', () => {
      cy.getByTestSubj(CONDITION_VALUE).clear();
      cy.getByTestSubj(CONDITION_VALUE).type('aaaaaaaaaaaaaa as custom input');
      cy.get('button[role="option"]').should('have.length', 0);

      cy.getByTestSubj(CONDITION_VALUE).find('input').clear();
      cy.get('button[role="option"]').should('have.length.above', 1);
    });
  });
});
