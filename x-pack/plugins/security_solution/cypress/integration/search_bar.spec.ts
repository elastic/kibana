/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from '../tasks/login';
import { openAddFilterPopover, fillAddFilterForm } from '../tasks/search_bar';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../screens/search_bar';
import { SearchBarFilter } from '../objects/filter';

import { HOSTS_PAGE } from '../urls/navigation';

describe('SearchBar', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  it('adds correctly a filter to the global search bar', () => {
    const filter: SearchBarFilter = {
      key: 'host.ip',
      value: '1.1.1.1',
    };

    openAddFilterPopover();
    fillAddFilterForm(filter);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM(filter)).should('be.visible');
  });
});
