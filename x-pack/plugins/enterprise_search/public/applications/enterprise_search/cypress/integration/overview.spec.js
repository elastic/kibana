"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../../../shared/cypress/commands");
const routes_1 = require("../../../shared/cypress/routes");
context('Enterprise Search Overview', () => {
    beforeEach(() => {
        commands_1.login();
    });
    it('should contain product cards', () => {
        cy.visit(routes_1.overviewPath);
        cy.contains('Welcome to Elastic Enterprise Search');
        cy.get('[data-test-subj="appSearchProductCard"]')
            .contains('Launch App Search')
            .should('have.attr', 'href')
            .and('match', /app_search/);
        cy.get('[data-test-subj="workplaceSearchProductCard"]')
            .contains('Launch Workplace Search')
            .should('have.attr', 'href')
            .and('match', /workplace_search/);
    });
    it('should have a setup guide', () => {
        // @see https://github.com/quasarframework/quasar/issues/2233#issuecomment-492975745
        // This only appears to occur for setup guides - I haven't (yet?) run into it on other pages
        cy.on('uncaught:exception', (err) => {
            if (err.message.includes('> ResizeObserver loop limit exceeded'))
                return false;
        });
        cy.visit(`${routes_1.overviewPath}/setup_guide`);
        cy.contains('Setup Guide');
        cy.contains('Add your Enterprise Search host URL to your Kibana configuration');
    });
});
