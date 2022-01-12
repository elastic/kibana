/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import { ROLES } from '../../test';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('T1 Analyst - Live Query', () => {
  beforeEach(() => {
    login(ROLES.t1_analyst);
  });

  describe('should run a live query', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
    });
    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
    });
    it('when passed as a saved query ', () => {
      navigateTo('/app/osquery/saved_queries');
      cy.waitForReact(1000);
    });
  });
});
