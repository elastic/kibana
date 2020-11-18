/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spacesMock } from '../../../spaces/server/mocks';

import { auditServiceMock } from '../audit/index.mock';
import { authorizationMock } from '../authorization/index.mock';
import { setupSpacesClient } from './setup_spaces_client';

describe('setupSpacesClient', () => {
  it('does not setup the spaces client when spaces is disabled', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();

    setupSpacesClient({ authz, audit });

    expect(audit.getLogger).not.toHaveBeenCalled();
  });

  it('configures the repository factory, wrapper, and audit logger', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();
    const spaces = spacesMock.createSetup();

    setupSpacesClient({ authz, audit, spaces });

    expect(spaces.spacesClient.registerClientWrapper).toHaveBeenCalledTimes(1);
    expect(spaces.spacesClient.setClientRepositoryFactory).toHaveBeenCalledTimes(1);
    expect(audit.getLogger).toHaveBeenCalledTimes(1);
  });
});
