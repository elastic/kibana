/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';

describe(`Soc_manager`, { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  beforeEach(() => {
    cy.login('soc_manager');
    navigateTo('/app/osquery');
  });

  it('should run query and do not show discover nor lens', () => {
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime;');
    submitQuery();
    checkResults();
    checkActionItemsInResults({
      lens: false,
      discover: false,
      cases: true,
      timeline: false,
    });
  });
});
