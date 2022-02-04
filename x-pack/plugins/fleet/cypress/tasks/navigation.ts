/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTEGRATIONS = 'app/integrations#/';
export const FLEET = 'app/fleet/';
export const LOGIN_API_ENDPOINT = '/internal/security/login';
export const LOGOUT_API_ENDPOINT = '/api/security/logout';
export const LOGIN_URL = '/login';
export const LOGOUT_URL = '/logout';

export const hostDetailsUrl = (hostName: string) =>
  `/app/security/hosts/${hostName}/authentications`;

export const navigateTo = (page: string) => {
  cy.visit(page);
};
