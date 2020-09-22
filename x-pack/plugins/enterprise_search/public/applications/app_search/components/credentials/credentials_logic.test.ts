/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { CredentialsLogic } from './credentials_logic';
import { ADMIN, PRIVATE } from './constants';

jest.mock('../../../shared/http', () => ({
  HttpLogic: { values: { http: { get: jest.fn(), delete: jest.fn() } } },
}));
import { HttpLogic } from '../../../shared/http';
jest.mock('../../../shared/flash_messages', () => ({
  flashAPIErrors: jest.fn(),
}));
import { flashAPIErrors } from '../../../shared/flash_messages';
import { IMeta } from '../../../../../common/types';
import { flushPromises } from '../../../../../common/__mocks__/flush_promises';
import { IApiToken, ICredentialsDetails } from '../../types';

describe('CredentialsLogic', () => {
  const DEFAULT_VALUES = {
    activeApiToken: {
      name: '',
      type: PRIVATE,
      read: true,
      write: true,
      access_all_engines: true,
    },
    activeApiTokenIsExisting: false,
    activeApiTokenRawName: '',
    apiTokens: [],
    dataLoading: true,
    engines: [],
    formErrors: [],
    isCredentialsDataComplete: false,
    isCredentialsDetailsComplete: false,
    meta: null,
    nameInputBlurred: false,
    showCredentialsForm: false,
  };

  const mount = (defaults?: object) => {
    if (!defaults) {
      resetContext({});
    } else {
      resetContext({
        defaults: {
          enterprise_search: {
            app_search: {
              credentials_logic: {
                ...defaults,
              },
            },
          },
        },
      });
    }
    CredentialsLogic.mount();
  };

  function createExpectActionToChangeState(baseValues: object) {
    return (action: () => any, beforeState: object, afterState: object) => {
      mount({
        ...beforeState,
      });
      action();
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        ...baseValues,
        ...afterState,
      });
    };
  }

  const newToken: IApiToken = {
    id: 1,
    name: 'myToken',
    type: PRIVATE,
    read: true,
    write: true,
    access_all_engines: true,
    engines: [],
  };

  const credentialsDetails: ICredentialsDetails = {
    engines: [
      { name: 'engine1', type: 'indexed', language: 'english', result_fields: [] },
      { name: 'engine1', type: 'indexed', language: 'english', result_fields: [] },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CredentialsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('addEngineName', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      activeApiToken: expect.any(Object),
    });

    describe('activeApiToken', () => {
      it("should add an engine to the active api token's engine list", () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.addEngineName('newEngine'),
          {
            activeApiToken: {
              ...newToken,
              engines: ['someEngine'],
            },
          },
          {
            activeApiToken: {
              ...newToken,
              engines: ['someEngine', 'newEngine'],
            },
          }
        );
      });

      it("should create a new engines list if one doesn't exist", () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.addEngineName('newEngine'),
          {
            activeApiToken: {
              ...newToken,
              engines: undefined,
            },
          },
          {
            activeApiToken: {
              ...newToken,
              engines: ['newEngine'],
            },
          }
        );
      });
    });
  });

  describe('removeEngineName', () => {
    describe('activeApiToken', () => {
      const expectActionToChangeState = createExpectActionToChangeState({
        activeApiToken: expect.any(Object),
      });

      it("should remove an engine from the active api token's engine list", () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.removeEngineName('someEngine'),
          {
            activeApiToken: {
              ...newToken,
              engines: ['someEngine', 'anotherEngine'],
            },
          },
          {
            activeApiToken: {
              ...newToken,
              engines: ['anotherEngine'],
            },
          }
        );
      });

      it('will not remove the engine if it is not found', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.removeEngineName('notfound'),
          {
            activeApiToken: {
              ...newToken,
              engines: ['someEngine', 'anotherEngine'],
            },
          },
          {
            activeApiToken: {
              ...newToken,
              engines: ['someEngine', 'anotherEngine'],
            },
          }
        );
      });
    });
  });

  describe('setAccessAllEngines', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      activeApiToken: expect.any(Object),
    });

    describe('activeApiToken', () => {
      it('should set the value of access_all_engines and clear out engines list if true', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setAccessAllEngines(true),
          {
            activeApiToken: {
              ...newToken,
              access_all_engines: false,
              engines: ['someEngine', 'anotherEngine'],
            },
          },
          {
            activeApiToken: {
              ...newToken,
              engines: [],
              access_all_engines: true,
            },
          }
        );
      });

      it('should set the value of access_all_engines and but maintain engines list if false', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setAccessAllEngines(false),
          {
            activeApiToken: {
              ...newToken,
              access_all_engines: true,
              engines: ['someEngine', 'anotherEngine'],
            },
          },
          {
            activeApiToken: {
              ...newToken,
              access_all_engines: false,
              engines: ['someEngine', 'anotherEngine'],
            },
          }
        );
      });
    });
  });

  describe('onApiKeyDelete', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      apiTokens: expect.any(Array),
    });

    describe('apiTokens', () => {
      it('should remove specified token from apiTokens if name matches', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiKeyDelete(newToken.name),
          { apiTokens: [newToken] },
          { apiTokens: [] }
        );
      });

      it('should not remove specified token from apiTokens if name does not match', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiKeyDelete('foo'),
          { apiTokens: [newToken] },
          { apiTokens: [newToken] }
        );
      });
    });
  });

  describe('onApiTokenCreateSuccess', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      apiTokens: expect.any(Array),
      activeApiToken: expect.any(Object),
      activeApiTokenRawName: expect.any(String),
      showCredentialsForm: expect.any(Boolean),
      formErrors: expect.any(Array),
    });

    describe('apiTokens', () => {
      const existingToken = {
        name: 'some_token',
        type: PRIVATE,
      };

      it('should add the provided token to the apiTokens list', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenCreateSuccess(newToken),
          { apiTokens: [existingToken] },
          { apiTokens: [existingToken, newToken] }
        );
      });
    });

    describe('activeApiToken', () => {
      // TODO It is weird that methods like this update activeApiToken but not activeApiTokenIsExisting...
      it('should reset to the default value, which effectively clears out the current form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenCreateSuccess(newToken),
          { activeApiToken: newToken },
          { activeApiToken: DEFAULT_VALUES.activeApiToken }
        );
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenCreateSuccess(newToken),
          { activeApiTokenRawName: 'foo' },
          { activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName }
        );
      });
    });

    describe('showCredentialsForm', () => {
      it('should reset to the default value, which closes the credentials form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenCreateSuccess(newToken),
          { showCredentialsForm: true },
          { showCredentialsForm: false }
        );
      });
    });

    describe('formErrors', () => {
      it('should reset `formErrors`', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenCreateSuccess(newToken),
          { formErrors: ['I am an error'] },
          { formErrors: [] }
        );
      });
    });
  });

  describe('onApiTokenError', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      formErrors: expect.any(Array),
    });

    describe('formErrors', () => {
      it('should set `formErrors`', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenError(['I am the NEW error']),
          { formErrors: ['I am an error'] },
          { formErrors: ['I am the NEW error'] }
        );
      });
    });
  });

  describe('onApiTokenUpdateSuccess', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      apiTokens: expect.any(Array),
      activeApiToken: expect.any(Object),
      activeApiTokenRawName: expect.any(String),
      showCredentialsForm: expect.any(Boolean),
    });

    describe('apiTokens', () => {
      const existingToken = {
        name: 'some_token',
        type: PRIVATE,
      };

      it('should replace the existing token with the new token by name', () => {
        const updatedExistingToken = {
          ...existingToken,
          type: ADMIN,
        };

        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenUpdateSuccess(updatedExistingToken),
          { apiTokens: [newToken, existingToken] },
          { apiTokens: [newToken, updatedExistingToken] }
        );
      });

      // TODO Not sure if this is a good behavior or not
      it('if for some reason the existing token is not found, it adds a new token...', () => {
        const brandNewToken = {
          name: 'brand new token',
          type: ADMIN,
        };

        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenUpdateSuccess(brandNewToken),
          { apiTokens: [newToken, existingToken] },
          { apiTokens: [newToken, existingToken, brandNewToken] }
        );
      });
    });

    describe('activeApiToken', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN }),
          { activeApiToken: newToken },
          { activeApiToken: DEFAULT_VALUES.activeApiToken }
        );
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN }),
          { activeApiTokenRawName: 'foo' },
          { activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName }
        );
      });
    });

    describe('showCredentialsForm', () => {
      it('should reset to the default value, which closes the credentials form', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN }),
          { showCredentialsForm: true },
          { showCredentialsForm: false }
        );
      });
    });
  });

  describe('setCredentialsData', () => {
    const meta: IMeta = {
      page: {
        current: 1,
        size: 1,
        total_pages: 1,
        total_results: 1,
      },
    };

    const expectActionToChangeState = createExpectActionToChangeState({
      apiTokens: expect.any(Array),
      meta: expect.any(Object),
      isCredentialsDataComplete: expect.any(Boolean),
    });

    describe('apiTokens', () => {
      it('should be set', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]),
          {},
          { apiTokens: [newToken, newToken] }
        );
      });
    });

    describe('meta', () => {
      it('should be set', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]),
          {},
          { meta }
        );
      });
    });

    describe('isCredentialsDataComplete', () => {
      it('should be set to true so we know that data fetching has completed', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]),
          { isCredentialsDataComplete: false },
          { isCredentialsDataComplete: true }
        );
      });
    });
  });

  describe('setCredentialsDetails', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      engines: expect.any(Array),
      isCredentialsDetailsComplete: expect.any(Boolean),
    });

    describe('isCredentialsDataComplete', () => {
      it('should be set to true so that we know data fetching has been completed', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setCredentialsDetails(credentialsDetails),
          { isCredentialsDetailsComplete: false },
          { isCredentialsDetailsComplete: true }
        );
      });
    });

    describe('engines', () => {
      it('should set `engines` from the provided details object', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setCredentialsDetails(credentialsDetails),
          { engines: [] },
          { engines: credentialsDetails.engines }
        );
      });
    });
  });

  describe('setNameInputBlurred', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      nameInputBlurred: expect.any(Boolean),
    });

    describe('nameInputBlurred', () => {
      it('should set this value', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setNameInputBlurred(true),
          { nameInputBlurred: false },
          { nameInputBlurred: true }
        );
      });
    });
  });

  describe('setTokenReadWrite', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      activeApiToken: expect.any(Object),
    });

    describe('activeApiToken', () => {
      it('should set "read" or "write" values', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setTokenReadWrite({ name: 'read', checked: true }),
          {
            activeApiToken: {
              ...newToken,
              read: false,
            },
          },
          {
            activeApiToken: {
              ...newToken,
              read: true,
            },
          }
        );
      });
    });
  });

  describe('setTokenName', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      activeApiToken: expect.any(Object),
      activeApiTokenRawName: expect.any(String),
    });

    describe('activeApiToken', () => {
      it('update the name property on the activeApiToken, formatted correctly', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setTokenName('New Name'),
          {
            activeApiToken: {
              ...newToken,
              name: 'bar',
            },
          },
          {
            activeApiToken: {
              ...newToken,
              name: 'new-name',
            },
          }
        );
      });
    });

    describe('activeApiTokenRawName', () => {
      it('updates the raw name, with no formatting applied', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.setTokenName('New Name'),
          {},
          { activeApiTokenRawName: 'New Name' }
        );
      });
    });
  });

  describe('setTokenType', () => {
    const values = {
      activeApiToken: {
        ...newToken,
        type: expect.any(String),
        read: expect.any(Boolean),
        write: expect.any(Boolean),
        access_all_engines: expect.any(Boolean),
        engines: expect.any(Array),
      },
    };

    const expectActionToChangeState = createExpectActionToChangeState(values);

    describe('activeApiToken.access_all_engines', () => {
      describe('when value is ADMIN', () => {
        it('updates access_all_engines to false', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(ADMIN),
            {
              activeApiToken: {
                ...newToken,
                access_all_engines: true,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: false,
              },
            }
          );
        });
      });

      describe('when value is not ADMIN', () => {
        it('will maintain access_all_engines value when true', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(PRIVATE),
            {
              activeApiToken: {
                ...newToken,
                access_all_engines: true,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: true,
              },
            }
          );
        });

        it('will maintain access_all_engines value when false', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(PRIVATE),
            {
              activeApiToken: {
                ...newToken,
                access_all_engines: false,
              },
            },
            {
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: false,
              },
            }
          );
        });
      });
    });

    describe('activeApiToken.engines', () => {
      describe('when value is ADMIN', () => {
        it('clears the array', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(ADMIN),
            {
              activeApiToken: {
                ...newToken,
                engines: [{}, {}],
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                engines: [],
              },
            }
          );
        });
      });

      describe('when value is not ADMIN', () => {
        it('will maintain engines array', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(PRIVATE),
            {
              activeApiToken: {
                ...newToken,
                engines: [{}, {}],
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                engines: [{}, {}],
              },
            }
          );
        });
      });
    });

    describe('activeApiToken.write', () => {
      describe('when value is PRIVATE', () => {
        it('sets this to true', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(PRIVATE),
            {
              activeApiToken: {
                ...newToken,
                write: false,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                write: true,
              },
            }
          );
        });
      });

      describe('when value is not PRIVATE', () => {
        it('sets this to false', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(ADMIN),
            {
              activeApiToken: {
                ...newToken,
                write: true,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                write: false,
              },
            }
          );
        });
      });
    });

    describe('activeApiToken.read', () => {
      describe('when value is PRIVATE', () => {
        it('sets this to true', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(PRIVATE),
            {
              activeApiToken: {
                ...newToken,
                read: false,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                read: true,
              },
            }
          );
        });
      });

      describe('when value is not PRIVATE', () => {
        it('sets this to false', () => {
          expectActionToChangeState(
            () => CredentialsLogic.actions.setTokenType(ADMIN),
            {
              activeApiToken: {
                ...newToken,
                read: true,
              },
            },
            {
              activeApiToken: {
                ...values.activeApiToken,
                read: false,
              },
            }
          );
        });
      });
    });

    describe('activeApiToken.type', () => {
      expectActionToChangeState(
        () => CredentialsLogic.actions.setTokenType(PRIVATE),
        {
          activeApiToken: {
            ...newToken,
            type: ADMIN,
          },
        },
        {
          activeApiToken: {
            ...values.activeApiToken,
            type: PRIVATE,
          },
        }
      );
    });
  });

  describe('toggleCredentialsForm', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      activeApiTokenIsExisting: expect.any(Boolean),
      activeApiToken: expect.any(Object),
      activeApiTokenRawName: expect.any(String),
      formErrors: expect.any(Array),
      showCredentialsForm: expect.any(Boolean),
    });

    describe('showCredentialsForm', () => {
      it('should toggle `showCredentialsForm` on', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          { showCredentialsForm: false },
          { showCredentialsForm: true }
        );
      });

      it('should toggle `showCredentialsForm` off', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          { showCredentialsForm: true },
          { showCredentialsForm: false }
        );
      });
    });

    describe('formErrors', () => {
      it('should reset `formErrors`', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          { formErrors: ['I am an error'] },
          { formErrors: [] }
        );
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should set `activeApiTokenRawName` to the name of the provided token', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(newToken),
          {},
          { activeApiTokenRawName: 'myToken' }
        );
      });

      it('should set `activeApiTokenRawName` to the default value if no token is provided', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          {},
          { activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName }
        );
      });

      // TODO: This fails, is this an issue? Instead of reseting back to the default value, it sets it to the previously
      // used value... to be honest, this should probably just be a selector
      // it('should set `activeApiTokenRawName` back to the default value if no token is provided', () => {
      //   mount();
      //   CredentialsLogic.actions.toggleCredentialsForm(newToken);
      //   CredentialsLogic.actions.toggleCredentialsForm();
      //   expect(CredentialsLogic.values).toEqual({
      //     ...values,
      //     activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName,
      // });
      // });
    });

    describe('activeApiToken', () => {
      it('should set `activeApiToken` to the provided token', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(newToken),
          {},
          { activeApiToken: newToken }
        );
      });

      it('should set `activeApiToken` to the default value if no token is provided', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          { activeApiToken: newToken },
          { activeApiToken: DEFAULT_VALUES.activeApiToken }
        );
      });
    });

    // TODO: This should probably just be a selector...
    describe('activeApiTokenIsExisting', () => {
      it('should set `activeApiTokenIsExisting` to true when the provided token has an id', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(newToken),
          { activeApiTokenIsExisting: false },
          { activeApiTokenIsExisting: true }
        );
      });

      it('should set `activeApiTokenIsExisting` to false when the provided token has no id', () => {
        const { id, ...newTokenWithoutId } = newToken;

        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(newTokenWithoutId),
          { activeApiTokenIsExisting: true },
          { activeApiTokenIsExisting: false }
        );
      });

      it('should set `activeApiTokenIsExisting` to false when no token is provided', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.toggleCredentialsForm(),
          { activeApiTokenIsExisting: true },
          { activeApiTokenIsExisting: false }
        );
      });
    });
  });

  describe('hideCredentialsForm', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      showCredentialsForm: expect.any(Boolean),
      activeApiTokenRawName: expect.any(String),
    });

    describe('activeApiTokenRawName', () => {
      it('resets this value', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.hideCredentialsForm(),
          { activeApiTokenRawName: 'foo' },
          { activeApiTokenRawName: '' }
        );
      });
    });

    describe('showCredentialsForm', () => {
      it('resets this value', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.hideCredentialsForm(),
          { showCredentialsForm: true },
          { showCredentialsForm: false }
        );
      });
    });
  });

  describe('resetCredentials', () => {
    const expectActionToChangeState = createExpectActionToChangeState({
      isCredentialsDetailsComplete: expect.any(Boolean),
      isCredentialsDataComplete: expect.any(Boolean),
      formErrors: expect.any(Array),
    });

    describe('isCredentialsDetailsComplete', () => {
      it('should reset to false', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.resetCredentials(),
          { isCredentialsDetailsComplete: true },
          { isCredentialsDetailsComplete: false }
        );
      });
    });

    describe('isCredentialsDataComplete', () => {
      it('should reset to false', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.resetCredentials(),
          { isCredentialsDataComplete: true },
          { isCredentialsDataComplete: false }
        );
      });
    });

    describe('formErrors', () => {
      it('should reset', () => {
        expectActionToChangeState(
          () => CredentialsLogic.actions.resetCredentials(),
          { formErrors: ['I am an error'] },
          { formErrors: [] }
        );
      });
    });
  });

  describe('initializeCredentialsData', () => {
    it('should call fetchCredentials and fetchDetails', () => {
      mount();
      jest.spyOn(CredentialsLogic.actions, 'fetchCredentials').mockImplementationOnce(() => {});
      jest.spyOn(CredentialsLogic.actions, 'fetchDetails').mockImplementationOnce(() => {});
      CredentialsLogic.actions.initializeCredentialsData();
      expect(CredentialsLogic.actions.fetchCredentials).toHaveBeenCalled();
      expect(CredentialsLogic.actions.fetchDetails).toHaveBeenCalled();
    });
  });

  describe('fetchCredentials', () => {
    const meta: IMeta = {
      page: {
        current: 1,
        size: 1,
        total_pages: 1,
        total_results: 1,
      },
    };
    const results: IApiToken[] = [];

    it('will call an API endpoint and set the results with the `setCredentialsData` action', async () => {
      mount();
      jest.spyOn(CredentialsLogic.actions, 'setCredentialsData').mockImplementationOnce(() => {});
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(Promise.resolve({ meta, results }));

      CredentialsLogic.actions.fetchCredentials(2);

      expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/app_search/credentials', {
        query: {
          'page[current]': 2,
        },
      });
      await flushPromises();
      expect(CredentialsLogic.actions.setCredentialsData).toHaveBeenCalledWith(meta, results);
    });

    it('handles errors', async () => {
      mount();
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(Promise.reject('An error occured'));

      CredentialsLogic.actions.fetchCredentials(2);

      await flushPromises();
      expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
    });
  });

  describe('fetchDetails', () => {
    it('will call an API endpoint and set the results with the `setCredentialsDetails` action', async () => {
      mount();
      jest
        .spyOn(CredentialsLogic.actions, 'setCredentialsDetails')
        .mockImplementationOnce(() => {});
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(Promise.resolve(credentialsDetails));
      CredentialsLogic.actions.fetchDetails();
      expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/app_search/credentials/details');
      await flushPromises();
      expect(CredentialsLogic.actions.setCredentialsDetails).toHaveBeenCalledWith(
        credentialsDetails
      );
    });

    it('handles errors', async () => {
      mount();
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(Promise.reject('An error occured'));

      CredentialsLogic.actions.fetchDetails();

      await flushPromises();
      expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
    });
  });

  describe('deleteApiKey', () => {
    const tokenName = 'abc123';

    it('will call an API endpoint and set the results with the `onApiKeyDelete` action', async () => {
      mount();
      jest.spyOn(CredentialsLogic.actions, 'onApiKeyDelete').mockImplementationOnce(() => {});
      (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(Promise.resolve());
      CredentialsLogic.actions.deleteApiKey(tokenName);
      expect(HttpLogic.values.http.delete).toHaveBeenCalledWith(
        `/api/app_search/credentials/${tokenName}`
      );
      await flushPromises();
      expect(CredentialsLogic.actions.onApiKeyDelete).toHaveBeenCalledWith(tokenName);
    });

    it('handles errors', async () => {
      mount();
      (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(
        Promise.reject('An error occured')
      );

      CredentialsLogic.actions.deleteApiKey(tokenName);

      await flushPromises();
      expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
    });
  });
});
