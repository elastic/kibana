"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const login = ({ username = Cypress.env('username'), password = Cypress.env('password'), } = {}) => {
    cy.request({
        method: 'POST',
        url: '/internal/security/login',
        headers: { 'kbn-xsrf': 'cypress' },
        body: {
            providerType: 'basic',
            providerName: 'basic',
            currentURL: '/',
            params: { username, password },
        },
    });
};
exports.login = login;
