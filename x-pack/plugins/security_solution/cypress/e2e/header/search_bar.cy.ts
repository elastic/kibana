/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../../tasks/login';
import { openAddFilterPopover, fillAddFilterForm } from '../../tasks/search_bar';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../screens/search_bar';
import { getHostIpFilter } from '../../objects/filter';

import { HOSTS_URL } from '../../urls/navigation';
import { waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';
import { cleanKibana } from '../../tasks/common';

describe('SearchBar', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
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
});
