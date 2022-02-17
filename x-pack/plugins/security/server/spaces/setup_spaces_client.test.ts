/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from 'src/core/server/mocks';

import { spacesMock } from '../../../spaces/server/mocks';
import { auditServiceMock } from '../audit/mocks';
import { authorizationMock } from '../authorization/index.mock';
import { setupSpacesClient } from './setup_spaces_client';

describe('setupSpacesClient', () => {
  it('does not setup the spaces client when spaces is disabled', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();

    setupSpacesClient({ authz, audit });
  });

  it('configures the repository factory, wrapper, and audit logger', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();
    const spaces = spacesMock.createSetup();

    setupSpacesClient({ authz, audit, spaces });

    expect(spaces.spacesClient.registerClientWrapper).toHaveBeenCalledTimes(1);
    expect(spaces.spacesClient.setClientRepositoryFactory).toHaveBeenCalledTimes(1);
  });

  it('creates a factory that creates an internal repository when RBAC is used for the request', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();
    const spaces = spacesMock.createSetup();

    const { savedObjects } = coreMock.createStart();

    setupSpacesClient({ authz, audit, spaces });

    expect(spaces.spacesClient.setClientRepositoryFactory).toHaveBeenCalledTimes(1);
    const [repositoryFactory] = spaces.spacesClient.setClientRepositoryFactory.mock.calls[0];

    const request = httpServerMock.createKibanaRequest();
    authz.mode.useRbacForRequest.mockReturnValueOnce(true);

    repositoryFactory(request, savedObjects);

    expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
    expect(savedObjects.createInternalRepository).toHaveBeenCalledWith(['space']);
    expect(savedObjects.createScopedRepository).not.toHaveBeenCalled();
  });

  it('creates a factory that creates a scoped repository when RBAC is NOT used for the request', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();
    const spaces = spacesMock.createSetup();

    const { savedObjects } = coreMock.createStart();

    setupSpacesClient({ authz, audit, spaces });

    expect(spaces.spacesClient.setClientRepositoryFactory).toHaveBeenCalledTimes(1);
    const [repositoryFactory] = spaces.spacesClient.setClientRepositoryFactory.mock.calls[0];

    const request = httpServerMock.createKibanaRequest();
    authz.mode.useRbacForRequest.mockReturnValueOnce(false);

    repositoryFactory(request, savedObjects);

    expect(savedObjects.createInternalRepository).not.toHaveBeenCalled();
    expect(savedObjects.createScopedRepository).toHaveBeenCalledTimes(1);
    expect(savedObjects.createScopedRepository).toHaveBeenCalledWith(request, ['space']);
  });

  it('registers a spaces client wrapper with scoped audit logger', () => {
    const authz = authorizationMock.create();
    const audit = auditServiceMock.create();
    const spaces = spacesMock.createSetup();

    setupSpacesClient({ authz, audit, spaces });

    expect(spaces.spacesClient.registerClientWrapper).toHaveBeenCalledTimes(1);
    const [wrapper] = spaces.spacesClient.registerClientWrapper.mock.calls[0];

    const request = httpServerMock.createKibanaRequest();

    wrapper(request, {} as any);

    expect(audit.asScoped).toHaveBeenCalledTimes(1);
    expect(audit.asScoped).toHaveBeenCalledWith(request);
  });
});
