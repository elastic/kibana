/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteUsersAndRoles,
  AutomaticImportIntegrRole,
  AutomaticImportIntegrUser,
  createUsersAndRoles,
  AutomaticImportConnectorNoneUser,
  AutomaticImportConnectorNoneRole,
  AutomaticImportConnectorAllUser,
  AutomaticImportConnectorAllRole,
} from '../tasks/privileges';
import { login, loginWithUserAndWaitForPage, logout } from '../tasks/login';
import {
  ASSISTANT_BUTTON,
  CREATE_INTEGRATION_ASSISTANT,
  CREATE_INTEGRATION_UPLOAD,
  MISSING_PRIVILEGES,
  UPLOAD_PACKAGE_LINK,
} from '../screens/integrations_automatic_import';

describe('When the user has Read previleges for Integrations', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportIntegrUser], [AutomaticImportIntegrRole]);
  });

  beforeEach(() => {
    login();
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportIntegrUser], [AutomaticImportIntegrRole]);
  });

  it('Create Assistant is not accessible if user has read role in integrations', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_ASSISTANT, AutomaticImportIntegrUser);
    cy.getBySel(MISSING_PRIVILEGES).should('exist');
  });

  it('Create upload is not accessible if user has read role in integrations', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_UPLOAD, AutomaticImportIntegrUser);
    cy.getBySel(MISSING_PRIVILEGES).should('exist');
  });
});

describe('When the user has All previleges for Integrations and No permissions for Connectors', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportConnectorNoneUser], [AutomaticImportConnectorNoneRole]);
  });

  beforeEach(() => {
    login();
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportConnectorNoneUser], [AutomaticImportConnectorNoneRole]);
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_ASSISTANT, AutomaticImportConnectorNoneUser);
    cy.getBySel(ASSISTANT_BUTTON).should('not.exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
  });
});

describe('When the user has All previleges for Integrations and All permissions for Connectors', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportConnectorAllUser], [AutomaticImportConnectorAllRole]);
  });

  beforeEach(() => {
    login();
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportConnectorAllUser], [AutomaticImportConnectorAllRole]);
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_ASSISTANT, AutomaticImportConnectorAllUser);
    cy.getBySel(ASSISTANT_BUTTON).should('not.exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
  });
});
