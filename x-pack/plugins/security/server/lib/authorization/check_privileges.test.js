/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { GLOBAL_RESOURCE } from '../../../common/constants';

const application = 'kibana-our_application';

const mockActions = {
  login: 'mock-action:login',
  version: 'mock-action:version',
};

const savedObjectTypes = ['foo-type', 'bar-type'];

const createMockShieldClient = (response) => {
  const mockCallWithRequest = jest.fn();

  mockCallWithRequest.mockImplementationOnce(async () => response);

  return {
    callWithRequest: mockCallWithRequest,
  };
};

describe('#checkPrivilegesAtSpace', () => {
  const checkPrivilegesAtSpaceTest = (description, {
    spaceId,
    privilegeOrPrivileges,
    esHasPrivilegesResponse,
    expectedResult,
    expectErrorThrown
  }) => {
    test(description, async () => {
      const mockShieldClient = createMockShieldClient(esHasPrivilegesResponse);
      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockActions, application, mockShieldClient);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);

      let actualResult;
      let errorThrown = null;
      try {
        actualResult = await checkPrivileges.atSpace(spaceId, privilegeOrPrivileges);
      } catch (err) {
        errorThrown = err;
      }

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [`space:${spaceId}`],
            privileges: uniq([
              mockActions.version,
              mockActions.login,
              ...Array.isArray(privilegeOrPrivileges) ? privilegeOrPrivileges : [privilegeOrPrivileges],
            ])
          }]
        }
      });

      if (expectedResult) {
        expect(errorThrown).toBeNull();
        expect(actualResult).toEqual(expectedResult);
      }

      if (expectErrorThrown) {
        expect(errorThrown).toMatchSnapshot();
      }
    });
  };

  checkPrivilegesAtSpaceTest('successful when checking for login and user has login', {
    spaceId: 'space_1',
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      privileges: {
        [mockActions.login]: true
      }
    },
  });

  checkPrivilegesAtSpaceTest(`failure when checking for login and user doesn't have login`, {
    spaceId: 'space_1',
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: false,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      privileges: {
        [mockActions.login]: false
      }
    },
  });

  checkPrivilegesAtSpaceTest(`throws error when checking for login and user has login but doesn't have version`, {
    spaceId: 'space_1',
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: false,
          }
        }
      }
    },
    expectErrorThrown: true,
  });

  checkPrivilegesAtSpaceTest(`successful when checking for two actions and the user has both`, {
    spaceId: 'space_1',
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      privileges: {
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
        [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
      }
    },
  });

  checkPrivilegesAtSpaceTest(`failure when checking for two actions and the user has only one`, {
    spaceId: 'space_1',
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      privileges: {
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
        [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
      }
    },
  });

  describe('with a malformed Elasticsearch response', () => {
    checkPrivilegesAtSpaceTest(`throws a validation error when an extra privilege is present in the response`, {
      spaceId: 'space_1',
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
              [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
            }
          }
        }
      },
      expectErrorThrown: true,
    });

    checkPrivilegesAtSpaceTest(`throws a validation error when privileges are missing in the response`, {
      spaceId: 'space_1',
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            }
          }
        }
      },
      expectErrorThrown: true,
    });
  });
});

describe('#checkPrivilegesAtSpaces', () => {
  const checkPrivilegesAtSpacesTest = (description, {
    spaceIds,
    privilegeOrPrivileges,
    esHasPrivilegesResponse,
    expectedResult,
    expectErrorThrown
  }) => {
    test(description, async () => {
      const mockShieldClient = createMockShieldClient(esHasPrivilegesResponse);
      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockActions, application, mockShieldClient);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);

      let actualResult;
      let errorThrown = null;
      try {
        actualResult = await checkPrivileges.atSpaces(spaceIds, privilegeOrPrivileges);
      } catch (err) {
        errorThrown = err;
      }

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: spaceIds.map(spaceId => `space:${spaceId}`),
            privileges: uniq([
              mockActions.version,
              mockActions.login,
              ...Array.isArray(privilegeOrPrivileges) ? privilegeOrPrivileges : [privilegeOrPrivileges],
            ])
          }]
        }
      });

      if (expectedResult) {
        expect(errorThrown).toBeNull();
        expect(actualResult).toEqual(expectedResult);
      }

      if (expectErrorThrown) {
        expect(errorThrown).toMatchSnapshot();
      }
    });
  };

  checkPrivilegesAtSpacesTest('successful when checking for login and user has login at both spaces', {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
          },
          'space:space_2': {
            [mockActions.login]: true,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      spacePrivileges: {
        space_1: {
          [mockActions.login]: true
        },
        space_2: {
          [mockActions.login]: true
        },
      }
    },
  });

  checkPrivilegesAtSpacesTest('failure when checking for login and user has login at only one space', {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
          },
          'space:space_2': {
            [mockActions.login]: false,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      spacePrivileges: {
        space_1: {
          [mockActions.login]: true
        },
        space_2: {
          [mockActions.login]: false
        },
      }
    },
  });

  checkPrivilegesAtSpacesTest(`throws error when checking for login and user has login but doesn't have version`, {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: false,
          },
          'space:space_2': {
            [mockActions.login]: true,
            [mockActions.version]: false,
          }
        }
      }
    },
    expectErrorThrown: true,
  });

  checkPrivilegesAtSpacesTest(`throws error when Elasticsearch returns malformed response`, {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          },
          'space:space_2': {
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectErrorThrown: true,
  });

  checkPrivilegesAtSpacesTest(`successful when checking for two actions at two spaces and user has it all`, {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          },
          'space:space_2': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      spacePrivileges: {
        space_1: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
        },
        space_2: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
        }
      }
    },
  });

  checkPrivilegesAtSpacesTest(`failure when checking for two actions at two spaces and user has one action at one space`, {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
          },
          'space:space_2': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      spacePrivileges: {
        space_1: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
        },
        space_2: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
        }
      }
    },
  });

  checkPrivilegesAtSpacesTest(`failure when checking for two actions at two spaces and user has two actions at one space`, {
    spaceIds: ['space_1', 'space_2'],
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          'space:space_1': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          },
          'space:space_2': {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      spacePrivileges: {
        space_1: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
        },
        space_2: {
          [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
          [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
        }
      }
    },
  });

  checkPrivilegesAtSpacesTest(
    `failure when checking for two actions at two spaces and user has two actions at one space & one action at the other`, {
      spaceIds: ['space_1', 'space_2'],
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
              [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
              [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
            }
          }
        }
      },
      expectedResult: {
        hasAllRequested: false,
        username: 'foo-username',
        spacePrivileges: {
          space_1: {
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          },
          space_2: {
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: false,
          }
        }
      },
    });

  describe('with a malformed Elasticsearch response', () => {
    checkPrivilegesAtSpacesTest(`throws a validation error when an extra privilege is present in the response`, {
      spaceIds: ['space_1', 'space_2'],
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
              [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
            },
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            }
          }
        }
      },
      expectErrorThrown: true,
    });

    checkPrivilegesAtSpacesTest(`throws a validation error when privileges are missing in the response`, {
      spaceIds: ['space_1', 'space_2'],
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
            },
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            }
          }
        }
      },
      expectErrorThrown: true,
    });

    checkPrivilegesAtSpacesTest(`throws a validation error when an extra space is present in the response`, {
      spaceIds: ['space_1', 'space_2'],
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            },
            'space:space_2': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            },
            'space:space_3': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            },
          }
        }
      },
      expectErrorThrown: true,
    });

    checkPrivilegesAtSpacesTest(`throws a validation error when an a space is missing in the response`, {
      spaceIds: ['space_1', 'space_2'],
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            'space:space_1': {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            }
          }
        }
      },
      expectErrorThrown: true,
    });
  });
});

describe('#checkPrivilegesGlobally', () => {
  const checkPrivilegesGloballyTest = (description, {
    privilegeOrPrivileges,
    esHasPrivilegesResponse,
    expectedResult,
    expectErrorThrown
  }) => {
    test(description, async () => {
      const mockShieldClient = createMockShieldClient(esHasPrivilegesResponse);
      const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(mockActions, application, mockShieldClient);
      const request = Symbol();
      const checkPrivileges = checkPrivilegesWithRequest(request);

      let actualResult;
      let errorThrown = null;
      try {
        actualResult = await checkPrivileges.globally(privilegeOrPrivileges);
      } catch (err) {
        errorThrown = err;
      }

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [GLOBAL_RESOURCE],
            privileges: uniq([
              mockActions.version,
              mockActions.login,
              ...Array.isArray(privilegeOrPrivileges) ? privilegeOrPrivileges : [privilegeOrPrivileges],
            ])
          }]
        }
      });

      if (expectedResult) {
        expect(errorThrown).toBeNull();
        expect(actualResult).toEqual(expectedResult);
      }

      if (expectErrorThrown) {
        expect(errorThrown).toMatchSnapshot();
      }
    });
  };

  checkPrivilegesGloballyTest('successful when checking for login and user has login', {
    spaceId: 'space_1',
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.login]: true,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      privileges: {
        [mockActions.login]: true
      }
    },
  });

  checkPrivilegesGloballyTest(`failure when checking for login and user doesn't have login`, {
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.login]: false,
            [mockActions.version]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      privileges: {
        [mockActions.login]: false
      }
    },
  });

  checkPrivilegesGloballyTest(`throws error when checking for login and user has login but doesn't have version`, {
    privilegeOrPrivileges: mockActions.login,
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.login]: true,
            [mockActions.version]: false,
          }
        }
      }
    },
    expectErrorThrown: true,
  });

  checkPrivilegesGloballyTest(`throws error when Elasticsearch returns malformed response`, {
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectErrorThrown: true,
  });

  checkPrivilegesGloballyTest(`successful when checking for two actions and the user has both`, {
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: true,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: true,
      username: 'foo-username',
      privileges: {
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: true,
        [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
      }
    },
  });

  checkPrivilegesGloballyTest(`failure when checking for two actions and the user has only one`, {
    privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`, `action:saved_objects/${savedObjectTypes[1]}/get`],
    esHasPrivilegesResponse: {
      has_all_requested: false,
      username: 'foo-username',
      application: {
        [application]: {
          [GLOBAL_RESOURCE]: {
            [mockActions.login]: true,
            [mockActions.version]: true,
            [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
            [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
          }
        }
      }
    },
    expectedResult: {
      hasAllRequested: false,
      username: 'foo-username',
      privileges: {
        [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
        [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
      }
    },
  });

  describe('with a malformed Elasticsearch response', () => {
    checkPrivilegesGloballyTest(`throws a validation error when an extra privilege is present in the response`, {
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: true,
              [`action:saved_objects/${savedObjectTypes[0]}/get`]: false,
              [`action:saved_objects/${savedObjectTypes[1]}/get`]: true,
            }
          }
        }
      },
      expectErrorThrown: true,
    });

    checkPrivilegesGloballyTest(`throws a validation error when privileges are missing in the response`, {
      privilegeOrPrivileges: [`action:saved_objects/${savedObjectTypes[0]}/get`],
      esHasPrivilegesResponse: {
        has_all_requested: false,
        username: 'foo-username',
        application: {
          [application]: {
            [GLOBAL_RESOURCE]: {
              [mockActions.login]: true,
              [mockActions.version]: true,
            }
          }
        }
      },
      expectErrorThrown: true,
    });
  });
});
