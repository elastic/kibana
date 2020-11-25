/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityPluginSetup } from '../../../../security/server';
import { SpacesClient } from './spaces_client';
import { ConfigType, ConfigSchema } from '../../config';
import { GetAllSpacesPurpose } from '../../../common/model/types';

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { securityMock } from '../../../../security/server/mocks';

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

  const mockAuthorization = securityMock.createSetup().authz;
  mockAuthorization.checkPrivilegesWithRequest.mockImplementation(() => ({
    atSpaces: mockCheckPrivilegesAtSpaces,
    atSpace: mockCheckPrivilegesAtSpace,
    globally: mockCheckPrivilegesGlobally,
  }));
  (mockAuthorization.actions.savedObject.get as jest.MockedFunction<
    typeof mockAuthorization.actions.savedObject.get
  >).mockImplementation((featureId, ...uiCapabilityParts) => {
    return `mockSavedObjectAction:${featureId}/${uiCapabilityParts.join('/')}`;
  });
  (mockAuthorization.actions.ui.get as jest.MockedFunction<
    typeof mockAuthorization.actions.ui.get
  >).mockImplementation((featureId, ...uiCapabilityParts) => {
    return `mockUiAction:${featureId}/${uiCapabilityParts.join('/')}`;
  });

  return {
    mockCheckPrivilegesAtSpaces,
    mockCheckPrivilegesAtSpace,
    mockCheckPrivilegesGlobally,
    mockAuthorization,
  };
};

const createMockConfig = (mockConfig: ConfigType = { maxSpaces: 1000, enabled: true }) => {
  return ConfigSchema.validate(mockConfig);
};

const baseSetup = (authorization: boolean | null) => {
  const mockAuditLogger = createMockAuditLogger();
  const mockAuthorizationAndFunctions = createMockAuthorization();
  if (authorization !== null) {
    mockAuthorizationAndFunctions.mockAuthorization.mode.useRbacForRequest.mockReturnValue(
      authorization
    );
  }
  const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
  const mockConfig = createMockConfig();
  const mockInternalRepository = savedObjectsRepositoryMock.create();
  const request = Symbol() as any;
  const client = new SpacesClient(
    mockAuditLogger as any,
    jest.fn(),
    authorization === null ? null : mockAuthorizationAndFunctions.mockAuthorization,
    mockCallWithRequestRepository,
    mockConfig,
    mockInternalRepository,
    request
  );

  return {
    mockAuditLogger,
    ...mockAuthorizationAndFunctions,
    mockCallWithRequestRepository,
    mockConfig,
    mockInternalRepository,
    request,
    client,
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
    {
      id: 'baz',
      attributes: {
        name: 'baz-name',
        description: 'baz-description',
        bar: 'baz-bar',
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
    {
      id: 'baz',
      name: 'baz-name',
      description: 'baz-description',
      bar: 'baz-bar',
    },
  ];

  const setup = (authorization: boolean | null) => {
    const result = baseSetup(authorization);
    const { mockCallWithRequestRepository, mockInternalRepository } = result;
    mockCallWithRequestRepository.find.mockResolvedValue({ saved_objects: savedObjects } as any);
    mockInternalRepository.find.mockResolvedValue({ saved_objects: savedObjects } as any);
    return result;
  };

  describe('authorization is null', () => {
    test(`finds spaces using callWithRequestRepository`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, mockConfig, client } = setup(null);
      const actualSpaces = await client.getAll();

      expect(actualSpaces).toEqual(expectedSpaces);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: mockConfig.maxSpaces,
        sortField: 'name.keyword',
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`finds spaces using callWithRequestRepository`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        mockConfig,
        request,
        client,
      } = setup(false);
      const actualSpaces = await client.getAll();

      expect(actualSpaces).toEqual(expectedSpaces);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: mockConfig.maxSpaces,
        sortField: 'name.keyword',
      });
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws Boom.badRequest when an invalid purpose is provided'`, async () => {
      const { mockAuthorization, client } = setup(false);
      const purpose = 'invalid_purpose' as GetAllSpacesPurpose;
      await expect(client.getAll({ purpose })).rejects.toThrowError(
        'unsupported space purpose: invalid_purpose'
      );

      expect(mockAuthorization.mode.useRbacForRequest).not.toHaveBeenCalled();
    });
  });

  describe('useRbacForRequest is true', () => {
    it('throws Boom.badRequest when an invalid purpose is provided', async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesAtSpaces,
        mockInternalRepository,
        client,
      } = setup(true);
      const purpose = 'invalid_purpose' as GetAllSpacesPurpose;
      await expect(client.getAll({ purpose })).rejects.toThrowError(
        'unsupported space purpose: invalid_purpose'
      );

      expect(mockInternalRepository.find).not.toHaveBeenCalled();
      expect(mockAuthorization.mode.useRbacForRequest).not.toHaveBeenCalled();
      expect(mockAuthorization.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      expect(mockCheckPrivilegesAtSpaces).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    [
      {
        purpose: undefined,
        expectedPrivileges: (mockAuthorization: SecurityPluginSetup['authz']) => [
          mockAuthorization.actions.login,
        ],
      },
      {
        purpose: 'any' as GetAllSpacesPurpose,
        expectedPrivileges: (mockAuthorization: SecurityPluginSetup['authz']) => [
          mockAuthorization.actions.login,
        ],
      },
      {
        purpose: 'copySavedObjectsIntoSpace' as GetAllSpacesPurpose,
        expectedPrivileges: () => [`mockUiAction:savedObjectsManagement/copyIntoSpace`],
      },
      {
        purpose: 'findSavedObjects' as GetAllSpacesPurpose,
        expectedPrivileges: (mockAuthorization: SecurityPluginSetup['authz']) => [
          mockAuthorization.actions.login,
          `mockSavedObjectAction:config/find`,
        ],
      },
      {
        purpose: 'shareSavedObjectsIntoSpace' as GetAllSpacesPurpose,
        expectedPrivileges: () => [`mockUiAction:savedObjectsManagement/shareIntoSpace`],
      },
    ].forEach((scenario) => {
      const { purpose } = scenario;
      describe(`with purpose='${purpose}'`, () => {
        test(`throws Boom.forbidden when user isn't authorized for any spaces`, async () => {
          const {
            mockAuditLogger,
            mockAuthorization,
            mockCheckPrivilegesAtSpaces,
            mockConfig,
            mockInternalRepository,
            request,
            client,
          } = setup(true);
          const username = Symbol();
          const privileges = scenario.expectedPrivileges(mockAuthorization);
          mockCheckPrivilegesAtSpaces.mockReturnValue({
            username,
            privileges: {
              kibana: privileges
                .map((privilege) => [
                  { resource: savedObjects[0].id, privilege, authorized: false },
                  { resource: savedObjects[1].id, privilege, authorized: false },
                  { resource: savedObjects[2].id, privilege, authorized: false },
                ])
                .flat(),
            },
          });
          await expect(client.getAll({ purpose })).rejects.toThrowError('Forbidden');

          expect(mockInternalRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledTimes(1);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            { kibana: privileges }
          );
          expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(
            username,
            'getAll'
          );
          expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
        });

        test(`returns spaces that the user is authorized for`, async () => {
          const {
            mockAuditLogger,
            mockAuthorization,
            mockCheckPrivilegesAtSpaces,
            mockConfig,
            mockInternalRepository,
            request,
            client,
          } = setup(true);
          const username = Symbol();
          const privileges = scenario.expectedPrivileges(mockAuthorization);
          mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
          mockCheckPrivilegesAtSpaces.mockReturnValue({
            username,
            privileges: {
              kibana: privileges
                .map((privilege) => [
                  { resource: savedObjects[0].id, privilege, authorized: true },
                  { resource: savedObjects[1].id, privilege, authorized: false },
                  { resource: savedObjects[2].id, privilege, authorized: false },
                ])
                .flat(),
            },
          });
          const actualSpaces = await client.getAll({ purpose });

          expect(actualSpaces).toEqual([expectedSpaces[0]]);
          expect(mockInternalRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledTimes(1);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            { kibana: privileges }
          );
          expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
          expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(
            username,
            'getAll',
            [savedObjects[0].id]
          );
        });
      });
    });
  });

  describe('includeAuthorizedPurposes is true', () => {
    const includeAuthorizedPurposes = true;

    ([
      'any',
      'copySavedObjectsIntoSpace',
      'findSavedObjects',
      'shareSavedObjectsIntoSpace',
    ] as GetAllSpacesPurpose[]).forEach((purpose) => {
      describe(`with purpose='${purpose}'`, () => {
        test('throws error', async () => {
          const { client } = setup(null);
          expect(client.getAll({ purpose, includeAuthorizedPurposes })).rejects.toThrowError(
            `'purpose' cannot be supplied with 'includeAuthorizedPurposes'`
          );
        });
      });
    });

    describe('with purpose=undefined', () => {
      describe('authorization is null', () => {
        test(`finds spaces using callWithRequestRepository and returns unaugmented results`, async () => {
          const { mockAuditLogger, mockCallWithRequestRepository, mockConfig, client } = setup(
            null
          );
          const actualSpaces = await client.getAll({ includeAuthorizedPurposes });

          expect(actualSpaces).toEqual(expectedSpaces);
          expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
          expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
        });
      });

      describe(`authorization.mode.useRbacForRequest returns false`, () => {
        test(`finds spaces using callWithRequestRepository and returns unaugmented results`, async () => {
          const {
            mockAuditLogger,
            mockAuthorization,
            mockCallWithRequestRepository,
            mockConfig,
            request,
            client,
          } = setup(false);
          const actualSpaces = await client.getAll({ includeAuthorizedPurposes });

          expect(actualSpaces).toEqual(expectedSpaces);
          expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
          expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
        });
      });

      describe('useRbacForRequest is true', () => {
        test(`throws Boom.forbidden when user isn't authorized for any spaces`, async () => {
          const {
            mockAuditLogger,
            mockAuthorization,
            mockCheckPrivilegesAtSpaces,
            mockConfig,
            mockInternalRepository,
            request,
            client,
          } = setup(true);
          const username = Symbol();
          const privileges = [
            mockAuthorization.actions.login,
            `mockUiAction:savedObjectsManagement/copyIntoSpace`,
            `mockSavedObjectAction:config/find`,
            `mockUiAction:savedObjectsManagement/shareIntoSpace`,
          ];
          mockCheckPrivilegesAtSpaces.mockReturnValue({
            username,
            privileges: {
              kibana: privileges
                .map((privilege) => [
                  { resource: savedObjects[0].id, privilege, authorized: false },
                  { resource: savedObjects[1].id, privilege, authorized: false },
                  { resource: savedObjects[2].id, privilege, authorized: false },
                ])
                .flat(),
            },
          });
          await expect(client.getAll({ includeAuthorizedPurposes })).rejects.toThrowError(
            'Forbidden'
          );

          expect(mockInternalRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledTimes(1);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            {
              kibana: [
                mockAuthorization.actions.login,
                `mockUiAction:savedObjectsManagement/copyIntoSpace`,
                mockAuthorization.actions.login, // the actual privilege check deduplicates this -- we mimicked that behavior in our mock result
                `mockSavedObjectAction:config/find`,
                `mockUiAction:savedObjectsManagement/shareIntoSpace`,
              ],
            }
          );
          expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(
            username,
            'getAll'
          );
          expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
        });

        test(`returns augmented spaces that the user is authorized for`, async () => {
          const {
            mockAuditLogger,
            mockAuthorization,
            mockCheckPrivilegesAtSpaces,
            mockConfig,
            mockInternalRepository,
            request,
            client,
          } = setup(true);
          const username = Symbol();
          const privileges = [
            mockAuthorization.actions.login,
            `mockUiAction:savedObjectsManagement/copyIntoSpace`,
            `mockSavedObjectAction:config/find`,
            `mockUiAction:savedObjectsManagement/shareIntoSpace`,
          ];
          mockCheckPrivilegesAtSpaces.mockReturnValue({
            username,
            privileges: {
              kibana: [
                ...privileges.map((privilege) => {
                  return { resource: savedObjects[0].id, privilege, authorized: true };
                }),
                {
                  resource: savedObjects[1].id,
                  privilege: mockAuthorization.actions.login,
                  authorized: false,
                },
                {
                  resource: savedObjects[1].id,
                  privilege: `mockUiAction:savedObjectsManagement/copyIntoSpace`,
                  authorized: false,
                },
                {
                  resource: savedObjects[1].id,
                  privilege: `mockSavedObjectAction:config/find`,
                  authorized: true, // special case -- this alone will not authorize the user for the 'findSavedObjects purpose, since it also requires the login action
                },
                {
                  resource: savedObjects[1].id,
                  privilege: `mockUiAction:savedObjectsManagement/shareIntoSpace`,
                  authorized: true, // note that this being authorized without the login action is contrived for this test case, and would never happen in a real world scenario
                },
                ...privileges.map((privilege) => {
                  return { resource: savedObjects[2].id, privilege, authorized: false };
                }),
              ],
            },
          });
          const actualSpaces = await client.getAll({ includeAuthorizedPurposes });

          expect(actualSpaces).toEqual([
            {
              ...expectedSpaces[0],
              authorizedPurposes: {
                any: true,
                copySavedObjectsIntoSpace: true,
                findSavedObjects: true,
                shareSavedObjectsIntoSpace: true,
              },
            },
            {
              ...expectedSpaces[1],
              authorizedPurposes: {
                any: false,
                copySavedObjectsIntoSpace: false,
                findSavedObjects: false,
                shareSavedObjectsIntoSpace: true,
              },
            },
          ]);
          expect(mockInternalRepository.find).toHaveBeenCalledWith({
            type: 'space',
            page: 1,
            perPage: mockConfig.maxSpaces,
            sortField: 'name.keyword',
          });
          expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledTimes(1);
          expect(mockCheckPrivilegesAtSpaces).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            {
              kibana: [
                mockAuthorization.actions.login,
                `mockUiAction:savedObjectsManagement/copyIntoSpace`,
                mockAuthorization.actions.login, // the actual privilege check deduplicates this -- we mimicked that behavior in our mock result
                `mockSavedObjectAction:config/find`,
                `mockUiAction:savedObjectsManagement/shareIntoSpace`,
              ],
            }
          );
          expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
          expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(
            username,
            'getAll',
            [savedObjects[0].id, savedObjects[1].id]
          );
        });
      });
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

  const setup = (authorization: boolean | null) => {
    const result = baseSetup(authorization);
    const { mockCallWithRequestRepository, mockInternalRepository } = result;
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject as any);
    mockInternalRepository.get.mockResolvedValue(savedObject as any);
    return result;
  };

  describe(`authorization is null`, () => {
    test(`gets space using callWithRequestRepository`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, client } = setup(null);
      const id = savedObject.id;
      const actualSpace = await client.get(id);

      expect(actualSpace).toEqual(expectedSpace);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`gets space using callWithRequestRepository`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        request,
        client,
      } = setup(false);
      const id = savedObject.id;
      const actualSpace = await client.get(id);

      expect(actualSpace).toEqual(expectedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden if the user isn't authorized at space`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesAtSpace,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpace.mockReturnValue({
        username,
        hasAllRequested: false,
      });
      const id = 'foo-space';

      await expect(client.get(id)).rejects.toThrowError('Unauthorized to get foo-space space');

      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpace).toHaveBeenCalledWith(id, {
        kibana: mockAuthorization.actions.login,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'get', [
        id,
      ]);
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns space using internalRepository if the user is authorized at space`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesAtSpace,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesAtSpace.mockReturnValue({
        username,
        hasAllRequested: true,
      });
      const id = savedObject.id;

      const space = await client.get(id);

      expect(space).toEqual(expectedSpace);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesAtSpace).toHaveBeenCalledWith(id, {
        kibana: mockAuthorization.actions.login,
      });
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
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
    disabledFeatures: [],
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  const savedObject = {
    id,
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      disabledFeatures: [],
    },
  };

  const expectedReturnedSpace = {
    id,
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  const setup = (authorization: boolean | null) => {
    const result = baseSetup(authorization);
    const { mockCallWithRequestRepository, mockInternalRepository } = result;
    mockCallWithRequestRepository.create.mockResolvedValue(savedObject as any);
    mockInternalRepository.create.mockResolvedValue(savedObject as any);
    return result;
  };

  describe(`authorization is null`, () => {
    test(`creates space using callWithRequestRepository when we're under the max`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, mockConfig, client } = setup(null);
      mockCallWithRequestRepository.find.mockResolvedValue({
        total: mockConfig.maxSpaces - 1,
      } as any);
      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockCallWithRequestRepository.create).toHaveBeenCalledWith('space', attributes, {
        id,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws bad request when we are at the maximum number of spaces`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, mockConfig, client } = setup(null);
      mockCallWithRequestRepository.find.mockResolvedValue({ total: mockConfig.maxSpaces } as any);
      await expect(client.create(spaceToCreate)).rejects.toThrowError(
        'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting'
      );

      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockCallWithRequestRepository.create).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`creates space using callWithRequestRepository when we're under the max`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        mockConfig,
        request,
        client,
      } = setup(false);
      mockCallWithRequestRepository.find.mockResolvedValue({
        total: mockConfig.maxSpaces - 1,
      } as any);
      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockCallWithRequestRepository.create).toHaveBeenCalledWith('space', attributes, {
        id,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws bad request when we're at the maximum number of spaces`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        mockConfig,
        request,
        client,
      } = setup(false);
      mockCallWithRequestRepository.find.mockResolvedValue({ total: mockConfig.maxSpaces } as any);
      await expect(client.create(spaceToCreate)).rejects.toThrowError(
        'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting'
      );

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockCallWithRequestRepository.create).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden if the user isn't authorized at space`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: false });
      await expect(client.create(spaceToCreate)).rejects.toThrowError(
        'Unauthorized to create spaces'
      );

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'create');
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`creates space using internalRepository if the user is authorized and we're under the max`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        mockConfig,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      mockInternalRepository.find.mockResolvedValue({
        total: mockConfig.maxSpaces - 1,
      } as any);
      const username = Symbol();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: true });
      const actualSpace = await client.create(spaceToCreate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockInternalRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockInternalRepository.create).toHaveBeenCalledWith('space', attributes, {
        id,
      });
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'create');
    });

    test(`throws bad request when we are at the maximum number of spaces`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        mockConfig,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      mockInternalRepository.find.mockResolvedValue({ total: mockConfig.maxSpaces } as any);
      const username = Symbol();
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: true });
      await expect(client.create(spaceToCreate)).rejects.toThrowError(
        'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting'
      );

      expect(mockInternalRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockInternalRepository.create).not.toHaveBeenCalled();
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
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
    disabledFeatures: [],
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  const savedObject = {
    id: 'foo',
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
      disabledFeatures: [],
    },
  };

  const expectedReturnedSpace = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: true,
    disabledFeatures: [],
  };

  const setup = (authorization: boolean | null) => {
    const result = baseSetup(authorization);
    const { mockCallWithRequestRepository, mockInternalRepository } = result;
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject as any);
    mockInternalRepository.get.mockResolvedValue(savedObject as any);
    return result;
  };

  describe(`authorization is null`, () => {
    test(`updates space using callWithRequestRepository`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, mockConfig, client } = setup(null);
      mockCallWithRequestRepository.find.mockResolvedValue({
        total: mockConfig.maxSpaces - 1,
      } as any);
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });
  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`updates space using callWithRequestRepository`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        request,
        client,
      } = setup(false);
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useRbacForRequest is true', () => {
    test(`throws Boom.forbidden when user isn't authorized at space`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ hasAllRequested: false, username });
      const id = savedObject.id;
      await expect(client.update(id, spaceToUpdate)).rejects.toThrowError(
        'Unauthorized to update spaces'
      );

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'update');
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`updates space using internalRepository if user is authorized`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ hasAllRequested: true, username });
      mockAuthorization.mode.useRbacForRequest.mockReturnValue(true);
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockInternalRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
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

  const setup = (authorization: boolean | null) => {
    const result = baseSetup(authorization);
    return result;
  };

  describe(`authorization is null`, () => {
    test(`throws bad request when the space is reserved`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, client } = setup(null);
      mockCallWithRequestRepository.get.mockResolvedValue(reservedSavedObject as any);
      await expect(client.delete(id)).rejects.toThrowError(
        'This Space cannot be deleted because it is reserved.'
      );

      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
      const { mockAuditLogger, mockCallWithRequestRepository, client } = setup(null);
      mockCallWithRequestRepository.get.mockResolvedValue(notReservedSavedObject as any);
      await client.delete(id);

      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.deleteByNamespace).toHaveBeenCalledWith(id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe(`authorization.mode.useRbacForRequest returns false`, () => {
    test(`throws bad request when the space is reserved`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        request,
        client,
      } = setup(false);
      mockCallWithRequestRepository.get.mockResolvedValue(reservedSavedObject as any);
      await expect(client.delete(id)).rejects.toThrowError(
        'This Space cannot be deleted because it is reserved.'
      );

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCallWithRequestRepository,
        request,
        client,
      } = setup(false);
      mockCallWithRequestRepository.get.mockResolvedValue(notReservedSavedObject as any);
      await client.delete(id);

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockCallWithRequestRepository.deleteByNamespace).toHaveBeenCalledWith(id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('authorization.mode.useRbacForRequest returns true', () => {
    test(`throws Boom.forbidden if the user isn't authorized`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: false });
      await expect(client.delete(id)).rejects.toThrowError('Unauthorized to delete spaces');

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockAuditLogger.spacesAuthorizationFailure).toHaveBeenCalledWith(username, 'delete');
      expect(mockAuditLogger.spacesAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws bad request if the user is authorized but the space is reserved`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: true });
      mockInternalRepository.get.mockResolvedValue(reservedSavedObject as any);
      await expect(client.delete(id)).rejects.toThrowError(
        'This Space cannot be deleted because it is reserved.'
      );

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete');
    });

    test(`deletes space using internalRepository if the user is authorized and the space isn't reserved`, async () => {
      const {
        mockAuditLogger,
        mockAuthorization,
        mockCheckPrivilegesGlobally,
        mockInternalRepository,
        request,
        client,
      } = setup(true);
      const username = Symbol();
      mockCheckPrivilegesGlobally.mockReturnValue({ username, hasAllRequested: true });
      mockInternalRepository.get.mockResolvedValue(notReservedSavedObject as any);
      await client.delete(id);

      expect(mockAuthorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(mockAuthorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivilegesGlobally).toHaveBeenCalledWith({
        kibana: mockAuthorization.actions.space.manage,
      });
      expect(mockInternalRepository.get).toHaveBeenCalledWith('space', id);
      expect(mockInternalRepository.delete).toHaveBeenCalledWith('space', id);
      expect(mockInternalRepository.deleteByNamespace).toHaveBeenCalledWith(id);
      expect(mockAuditLogger.spacesAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.spacesAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete');
    });
  });
});
