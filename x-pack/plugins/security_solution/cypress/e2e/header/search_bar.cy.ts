/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';
import {
  openAddFilterPopover,
  fillAddFilterForm,
  openKqlQueryBar,
  fillKqlQueryBar,
} from '../../tasks/search_bar';
import {
  AUTO_SUGGEST_AGENT_NAME,
  AUTO_SUGGEST_HOST_NAME_VALUE,
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
} from '../../screens/search_bar';
import { getHostIpFilter } from '../../objects/filter';

import { HOSTS_URL } from '../../urls/navigation';
import { waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';

describe('SearchBar', () => {
  before(() => {
    login();
  });

  beforeEach(() => {
    visit(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  it('adds correctly a filter to the global search bar', () => {
    openAddFilterPopover();
    fillAddFilterForm(getHostIpFilter());

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'have.text',
      `${getHostIpFilter().key}: ${getHostIpFilter().value}`
    );
  });

  it('auto suggests fields from the data view and auto completes available field values', () => {
    openKqlQueryBar();
    cy.get(AUTO_SUGGEST_AGENT_NAME).should('be.visible');
    fillKqlQueryBar(`host.name:`);
    cy.get(AUTO_SUGGEST_HOST_NAME_VALUE).should('be.visible');
  });
});
