/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from '../tasks/login';
import { openAddFilterPopover, fillAddFilterForm } from '../tasks/search_bar';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../screens/search_bar';
import { hostIpFilter } from '../objects/filter';

import { HOSTS_URL } from '../urls/navigation';
import { waitForAllHostsToBeLoaded } from '../tasks/hosts/all_hosts';

describe.skip('SearchBar', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  it('adds correctly a filter to the global search bar', () => {
    openAddFilterPopover();
    fillAddFilterForm(hostIpFilter);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM(hostIpFilter)).should('be.visible');
  });
});
