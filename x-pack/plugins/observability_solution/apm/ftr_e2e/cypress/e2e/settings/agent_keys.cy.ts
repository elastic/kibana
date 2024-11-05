/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const basePath = '/app/apm/settings/agent-keys';

const deleteAllAgentKeys = () => {
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.request({
    log: false,
    method: 'GET',
    url: `${kibanaUrl}/internal/apm/agent_keys`,
    body: {},
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'elastic', pass: 'changeme' },
  }).then((response) => {
    const promises = response.body.agentKeys.map((item: any) => {
      if (item.id) {
        return cy.request({
          log: false,
          method: 'POST',
          url: `${kibanaUrl}/internal/apm/api_key/invalidate`,
          body: {
            id: item.id,
          },
          headers: {
            'kbn-xsrf': 'e2e_test',
          },
          auth: { user: 'elastic', pass: 'changeme' },
        });
      }
    });
    return Promise.all(promises);
  });
};

const TEST_AGENT_KEY = 'test-agent-key';

const getAbleToModifyCase = () => {
  it('should be able to modify settings', () => {
    cy.visitKibana(basePath);
    const button = cy.get('button[data-test-subj="apmAgentKeysContentCreateApmAgentKeyButton"]');
    button.should('not.be.disabled');
    button.click();
    cy.get('input[data-test-subj="apmCreateAgentKeyFlyoutFieldText"]').type(TEST_AGENT_KEY);
    cy.get('button[data-test-subj="apmCreateAgentKeyFlyoutButton"]').click();
  });
};

const getUnableToModifyCase = () => {
  it('should not be able to modify settings', () => {
    cy.visitKibana(basePath);
    const button = cy.get('button[data-test-subj="apmAgentKeysContentCreateApmAgentKeyButton"]');
    button.should('be.disabled');
  });
};

describe('Agent keys', () => {
  describe('when logged in as a viewer', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      deleteAllAgentKeys();
    });

    it('should see missing privileges message', () => {
      cy.visitKibana(basePath);
      cy.contains('You need permission to manage API keys');
    });
  });

  describe('when logged in as an editor without write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmAllPrivilegesWithoutWriteSettingsUser();
      deleteAllAgentKeys();
    });

    getUnableToModifyCase();
  });

  describe('when logged in as a superuser', () => {
    beforeEach(() => {
      cy.loginAsSuperUser();
      deleteAllAgentKeys();
    });

    getAbleToModifyCase();
  });

  describe('when logged in as a viewer with write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmReadPrivilegesWithWriteSettingsUser();
      deleteAllAgentKeys();
    });

    getAbleToModifyCase();
  });
});
