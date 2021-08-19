/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login as baseLogin } from '../../../shared/cypress/commands';
import { workplaceSearchPath } from '../../../shared/cypress/routes';

interface Login {
  path?: string;
  username?: string;
  password?: string;
}
export const login = ({ path = '/', ...args }: Login = {}) => {
  baseLogin({ ...args });
  cy.visit(`${workplaceSearchPath}${path}`);
};
