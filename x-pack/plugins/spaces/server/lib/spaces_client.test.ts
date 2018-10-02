/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesClient } from './spaces_client';

const createMockAuditLogger = () => {
  return {
    spacesAuthorizationFailure: jest.fn(),
    spacesAuthorizationSuccess: jest.fn(),
  };
};

const createMockAuthorization = () => {
  const mockCheckPrivilegesAtSpace = jest.fn();
  const mockCheckPrivilegesAtSpaces = jest.fn();
  const mockCheckPrivilegesGlobally = jest.fn();

  const mockAuthorization = {
    actions: {
      login: 'action:login',
      manageSpaces: 'action:manageSpaces',
    },
    checkPrivilegesWithRequest: jest.fn(() => ({
      atSpaces: mockCheckPrivilegesAtSpaces,
      atSpace: mockCheckPrivilegesAtSpace,
      globally: mockCheckPrivilegesGlobally,
    })),
    mode: {
      useRbacForRequest: jest.fn(),
    },
  };

  return {
    mockCheckPrivilegesAtSpaces,
    mockCheckPrivilegesAtSpace,
    mockCheckPrivilegesGlobally,
    mockAuthorization,
  };
};

describe('#getAll', () => {
  const savedObjects = [
    {
      id: 'foo',
      attributes: {
        name: 'foo-name',
        description: 'foo-description',
        bar: 'foo-bar',
      },
    },
    {
      id: 'bar',
      attributes: {
        name: 'bar-name',
        description: 'bar-description',
        bar: 'bar-bar',
      },
    },
  ];

  const expectedSpaces = [
    {
      id: 'foo',
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
    {
      id: 'bar',
      name: 'bar-name',
      description: 'bar-description',
      bar: 'bar-bar',
    },
  ];

  describe('authorization is null', () => {
    test(`finds spaces using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        find: jest.fn(),
      };
      mockCallWithRequestRepository.find.mockReturnValue({
        saved_objects: savedObjects,
      });
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const actualSpaces = await client.getAll();

      expect(actualSpaces).toEqual(expectedSpaces);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 1000,
        sortField: 'name.keyword',
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`finds spaces using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        find: jest.fn().mockReturnValue({
          saved_objects: savedObjects,
        }),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const actualSpaces = await client.getAll();

      expect(actualSpaces).toEqual(expectedSpaces);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 1000,
        sortField: 'name.keyword',
      });
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden when user isn't authorized for any spaces`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesAtSpaces } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpaces.mockReturnValue({
        username,
        spacePrivileges: {
          [savedObjects[0].id]: {
            [mockAuthorization.actions.login]: false,
          },
          [savedObjects[1].id]: {
            [mockAuthorization.actions.login]: false,
          },
        },
      });
      const mockInternalRepository = {
        find: jest.fn().mockReturnValue({
          saved_objects: savedObjects,
        }),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );
      await expect(client.getAll()).rejects.toThrowErrorMatchingSnapshot();

      expect(mockInternalRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 1000,
        sortField: 'name.keyword',
      });
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
        savedObjects.map(savedObject => savedObject.id),
        mockAuthorization.actions.login
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'getAll');
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`returns spaces that the user is authorized for`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesAtSpaces } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpaces.mockReturnValue({
        username,
        spacePrivileges: {
          [savedObjects[0].id]: {
            [mockAuthorization.actions.login]: true,
          },
          [savedObjects[1].id]: {
            [mockAuthorization.actions.login]: false,
          },
        },
      });
      const mockInternalRepository = {
        find: jest.fn().mockReturnValue({
          saved_objects: savedObjects,
        }),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );
      const actualSpaces = await client.getAll();

      expect(actualSpaces).toEqual([expectedSpaces[0]]);
      expect(mockInternalRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 1000,
        sortField: 'name.keyword',
      });
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
        savedObjects.map(savedObject => savedObject.id),
        mockAuthorization.actions.login
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'getAll', [
        savedObjects[0].id,
      ]);
    });
  });
});

describe('#canEnumerateSpaces', () => {
  describe(`authorization is null`, () => {
    test(`returns true`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const request = Symbol();

      const client = new SpacesClient(mockAuditLogger as any, authorization, null, null, request);

      const canEnumerateSpaces = await client.canEnumerateSpaces();
      expect(canEnumerateSpaces).toEqual(true);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe(`authorization.mode.useRbacForRequest is false`, () => {
    test(`returns true`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );
      const canEnumerateSpaces = await client.canEnumerateSpaces();

      expect(canEnumerateSpaces).toEqual(true);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`returns false if user is not authorized to enumerate spaces`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: false,
      });
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );

      const canEnumerateSpaces = await client.canEnumerateSpaces();
      expect(canEnumerateSpaces).toEqual(false);

      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );

      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`returns true if user is authorized to enumerate spaces`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );

      const canEnumerateSpaces = await client.canEnumerateSpaces();
      expect(canEnumerateSpaces).toEqual(true);

      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );

      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });
});

describe('#get', () => {
  const savedObject = {
    id: 'foo',
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
  };

  const expectedSpace = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
  };

  describe(`authorization is null`, () => {
    test(`gets space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const id = savedObject.id;
      const actualSpace = await client.get(id);

      expect(actualSpace).toEqual(expectedSpace);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`gets space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const id = savedObject.id;
      const actualSpace = await client.get(id);

      expect(actualSpace).toEqual(expectedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden if the user isn't authorized at space`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesAtSpace } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpace.mockReturnValue({
        username,
        hasAllRequested: false,
      });
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );
      const id = 'foo-space';

      await expect(client.get(id)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpace).toHaveBeenCalledWith(id, mockAuthorization.actions.login);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'get', [
        id,
      ]);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`returns space using internalRepository if the user is authorized at space`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesAtSpace } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpace.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const request = Symbol();
      const mockInternalRepository = {
        get: jest.fn().mockReturnValue(savedObject),
      };

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );
      const id = savedObject.id;

      const space = await client.get(id);

      expect(space).toEqual(expectedSpace);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpace).toHaveBeenCalledWith(id, mockAuthorization.actions.login);
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'get', [
        id,
      ]);
    });
  });
});

describe('#create', () => {
  const id = 'foo';

  const spaceToCreate = {
    id,
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: true,
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
  };

  const savedObject = {
    id,
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
  };

  const expectedReturnedSpace = {
    id,
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
  };

  describe(`authorization is null`, () => {
    test(`creates space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        create: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockCallWithRequestRepository.create).toHaveBeenCalledWith('space', attributes, {
        id,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`creates space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        create: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.create).toHaveBeenCalledWith('space', attributes, {
        id,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden if the user isn't authorized at space`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: false,
      });
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );

      await expect(client.create(spaceToCreate)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'create');
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`creates space using internalRepository if the user is authorized`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const mockInternalRepository = {
        create: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );

      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'create');
    });
  });
});

describe('#update', () => {
  const spaceToUpdate = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: false,
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
  };

  const savedObject = {
    id: 'foo',
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
    },
  };

  const expectedReturnedSpace = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: true,
  };

  describe(`authorization is null`, () => {
    test(`updates space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        update: jest.fn(),
        get: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });
  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`updates space using callWithRequestRepository`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        update: jest.fn(),
        get: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden when user isn't authorized at space`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockCheckPrivilegesGlobally.mockReturnValue({
        hasAllRequested: false,
        username,
      });
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );
      const id = savedObject.id;
      await expect(client.update(id, spaceToUpdate)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'update');
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`updates space using internalRepository if user is authorized`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockCheckPrivilegesGlobally.mockReturnValue({
        hasAllRequested: true,
        username,
      });
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      const mockInternalRepository = {
        update: jest.fn(),
        get: jest.fn().mockReturnValue(savedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockInternalRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'update');
    });
  });
});

describe('#delete', () => {
  const id = 'foo';

  const reservedSavedObject = {
    id,
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
    },
  };

  const notReservedSavedObject = {
    id,
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
  };

  describe(`authorization is null`, () => {
    test(`throws Boom.badRequest when the space is reserved`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(reservedSavedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      await expect(client.delete(id)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const authorization = null;
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(notReservedSavedObject),
        delete: jest.fn(),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        authorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      await client.delete(id);

      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`throws Boom.badRequest when the space is reserved`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(reservedSavedObject),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      await expect(client.delete(id)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(false);
      const mockCallWithRequestRepository = {
        get: jest.fn().mockReturnValue(notReservedSavedObject),
        delete: jest.fn(),
      };
      const request = Symbol();

      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        mockCallWithRequestRepository,
        null,
        request
      );

      await client.delete(id);

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });
  });

  describe('authorization.mode.useRbacForRequest returns true', () => {
    test(`throws Boom.forbidden if the user isn't authorized`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: false,
      });
      const request = Symbol();
      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        null,
        request
      );

      await expect(client.delete(id)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'delete');
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledTimes(0);
    });

    test(`throws Boom.badRequest if the user is authorized but the space is reserved`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const mockInternalRepository = {
        get: jest.fn().mockReturnValue(reservedSavedObject),
      };
      const request = Symbol();
      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );

      await expect(client.delete(id)).rejects.toThrowErrorMatchingSnapshot();

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete');
    });

    test(`deletes space using internalRepository if the user is authorized and the space isn't reserved`, async () => {
      const username = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const { mockAuthorization, mockCheckPrivilegesGlobally } = createMockAuthorization();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const mockInternalRepository = {
        get: jest.fn().mockReturnValue(notReservedSavedObject),
        delete: jest.fn(),
      };
      const request = Symbol();
      const client = new SpacesClient(
        mockAuditLogger as any,
        mockAuthorization,
        null,
        mockInternalRepository,
        request
      );

      await client.delete(id);

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith(
        mockAuthorization.actions.manageSpaces
      );
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockInternalRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledTimes(0);
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete');
    });
  });
});
