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

  const newToken: IApiToken = {
    id: 1,
    name: 'myToken',
    type: PRIVATE,
    read: true,
    write: true,
    access_all_engines: true,
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
    describe('activeApiToken', () => {
      it("should add an engine to the active api token's engine list", () => {
        mount({
          activeApiToken: {
            ...newToken,
            engines: ['someEngine'],
          },
        });
        CredentialsLogic.actions.addEngineName('newEngine');
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          engines: ['someEngine', 'newEngine'],
        });
      });

      it("should create a new engines list if one doesn't exist", () => {
        mount({
          activeApiToken: {
            ...newToken,
            engines: undefined,
          },
        });
        CredentialsLogic.actions.addEngineName('newEngine');
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          engines: ['newEngine'],
        });
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.addEngineName('newEngine');
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
      });
    });
  });

  describe('removeEngineName', () => {
    describe('activeApiToken', () => {
      it("should remove an engine from the active api token's engine list", () => {
        mount({
          activeApiToken: {
            ...newToken,
            engines: ['someEngine', 'anotherEngine'],
          },
        });
        CredentialsLogic.actions.removeEngineName('someEngine');
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          engines: ['anotherEngine'],
        });
      });

      it('will not remove the engine if it is not found', () => {
        mount({
          activeApiToken: {
            ...newToken,
            engines: ['someEngine', 'anotherEngine'],
          },
        });
        CredentialsLogic.actions.removeEngineName('notfound');
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          engines: ['someEngine', 'anotherEngine'],
        });
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.removeEngineName('newEngine');
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
      });
    });
  });

  describe('setAccessAllEngines', () => {
    describe('activeApiToken', () => {
      it('should set the value of access_all_engines and clear out engines list if true', () => {
        mount({
          activeApiToken: {
            ...newToken,
            access_all_engines: false,
            engines: ['someEngine', 'anotherEngine'],
          },
        });
        CredentialsLogic.actions.setAccessAllEngines(true);
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          engines: [],
          access_all_engines: true,
        });
      });
    });

    it('should set the value of access_all_engines and but maintain engines list if false', () => {
      mount({
        activeApiToken: {
          ...newToken,
          access_all_engines: true,
          engines: ['someEngine', 'anotherEngine'],
        },
      });
      CredentialsLogic.actions.setAccessAllEngines(false);
      expect(CredentialsLogic.values.activeApiToken).toEqual({
        ...newToken,
        access_all_engines: false,
        engines: ['someEngine', 'anotherEngine'],
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setAccessAllEngines(true);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
      });
    });
  });

  describe('onApiKeyDelete', () => {
    describe('apiTokens', () => {
      it('should remove specified token from apiTokens if name matches', () => {
        mount({
          apiTokens: [newToken],
        });

        CredentialsLogic.actions.onApiKeyDelete(newToken.name);
        expect(CredentialsLogic.values.apiTokens).toEqual([]);
      });

      it('should not remove specified token from apiTokens if name does not match', () => {
        mount({
          apiTokens: [newToken],
        });

        CredentialsLogic.actions.onApiKeyDelete('foo');
        expect(CredentialsLogic.values.apiTokens).toEqual([newToken]);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.onApiKeyDelete('foo');
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
      });
    });
  });

  describe('onApiTokenCreateSuccess', () => {
    describe('apiTokens', () => {
      const existingToken = {
        name: 'some_token',
        type: PRIVATE,
      };

      it('should add the provided token to the apiTokens list', () => {
        mount({
          apiTokens: [existingToken],
        });

        CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
        expect(CredentialsLogic.values.apiTokens).toEqual([existingToken, newToken]);
      });
    });

    describe('activeApiToken', () => {
      // TODO It is weird that methods like this update activeApiToken but not activeApiTokenIsExisting...
      it('should reset to the default value, which effectively clears out the current form', () => {
        mount({
          activeApiToken: newToken,
        });

        CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
        expect(CredentialsLogic.values.activeApiToken).toEqual(DEFAULT_VALUES.activeApiToken);
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        mount({
          activeApiTokenRawName: 'foo',
        });

        CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual(
          DEFAULT_VALUES.activeApiTokenRawName
        );
      });
    });

    describe('showCredentialsForm', () => {
      it('should reset to the default value, which closes the credentials form', () => {
        mount({
          showCredentialsForm: true,
        });

        CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
        expect(CredentialsLogic.values.showCredentialsForm).toEqual(false);
      });
    });

    describe('formErrors', () => {
      it('should reset `formErrors`', () => {
        mount({
          formErrors: ['I am an error'],
        });

        CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
        expect(CredentialsLogic.values.formErrors).toEqual([]);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        showCredentialsForm: expect.any(Boolean),
        formErrors: expect.any(Array),
      });
    });
  });

  describe('onApiTokenError', () => {
    describe('formErrors', () => {
      it('should set `formErrors`', () => {
        mount({
          formErrors: ['I am an error'],
        });

        CredentialsLogic.actions.onApiTokenError(['I am the NEW error']);
        expect(CredentialsLogic.values.formErrors).toEqual(['I am the NEW error']);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.onApiTokenError(['I am the NEW error']);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        formErrors: expect.any(Array),
      });
    });
  });

  describe('onApiTokenUpdateSuccess', () => {
    describe('apiTokens', () => {
      const existingToken = {
        name: 'some_token',
        type: PRIVATE,
      };

      it('should replace the existing token with the new token by name', () => {
        mount({
          apiTokens: [newToken, existingToken],
        });
        const updatedExistingToken = {
          ...existingToken,
          type: ADMIN,
        };

        CredentialsLogic.actions.onApiTokenUpdateSuccess(updatedExistingToken);
        expect(CredentialsLogic.values.apiTokens).toEqual([newToken, updatedExistingToken]);
      });

      // TODO Not sure if this is a good behavior or not
      it('if for some reason the existing token is not found, it adds a new token...', () => {
        mount({
          apiTokens: [newToken, existingToken],
        });
        const brandNewToken = {
          name: 'brand new token',
          type: ADMIN,
        };

        CredentialsLogic.actions.onApiTokenUpdateSuccess(brandNewToken);
        expect(CredentialsLogic.values.apiTokens).toEqual([newToken, existingToken, brandNewToken]);
      });
    });

    describe('activeApiToken', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        mount({
          activeApiToken: newToken,
        });

        CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
        expect(CredentialsLogic.values.activeApiToken).toEqual(DEFAULT_VALUES.activeApiToken);
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should reset to the default value, which effectively clears out the current form', () => {
        mount({
          activeApiTokenRawName: 'foo',
        });

        CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual(
          DEFAULT_VALUES.activeApiTokenRawName
        );
      });
    });

    describe('showCredentialsForm', () => {
      it('should reset to the default value, which closes the credentials form', () => {
        mount({
          showCredentialsForm: true,
        });

        CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
        expect(CredentialsLogic.values.showCredentialsForm).toEqual(false);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        showCredentialsForm: expect.any(Boolean),
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

    describe('apiTokens', () => {
      it('should be set', () => {
        mount();
        CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
        expect(CredentialsLogic.values.apiTokens).toEqual([newToken, newToken]);
      });
    });

    describe('meta', () => {
      it('should be set', () => {
        mount();
        CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
        expect(CredentialsLogic.values.meta).toEqual(meta);
      });
    });

    describe('isCredentialsDataComplete', () => {
      it('should be set to true so we know that data fetching has completed', () => {
        mount({
          isCredentialsDataComplete: false,
        });
        CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
        expect(CredentialsLogic.values.isCredentialsDataComplete).toEqual(true);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
        meta: expect.any(Object),
        isCredentialsDataComplete: expect.any(Boolean),
      });
    });
  });

  describe('setCredentialsDetails', () => {
    describe('isCredentialsDataComplete', () => {
      it('should be set to true so that we know data fetching has been completed', () => {
        mount({
          isCredentialsDetailsComplete: false,
        });
        CredentialsLogic.actions.setCredentialsDetails(credentialsDetails);
        expect(CredentialsLogic.values.isCredentialsDetailsComplete).toEqual(true);
      });
    });

    describe('engines', () => {
      it('should set `engines` from the provided details object', () => {
        mount({
          engines: [],
        });
        CredentialsLogic.actions.setCredentialsDetails(credentialsDetails);
        expect(CredentialsLogic.values.engines).toEqual(credentialsDetails.engines);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setCredentialsDetails(credentialsDetails);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        engines: expect.any(Array),
        isCredentialsDetailsComplete: expect.any(Boolean),
      });
    });
  });

  describe('setNameInputBlurred', () => {
    describe('nameInputBlurred', () => {
      it('should set this value', () => {
        mount({
          nameInputBlurred: false,
        });
        CredentialsLogic.actions.setNameInputBlurred(true);
        expect(CredentialsLogic.values.nameInputBlurred).toEqual(true);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setNameInputBlurred(true);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        nameInputBlurred: expect.any(Boolean),
      });
    });
  });

  describe('setTokenReadWrite', () => {
    describe('activeApiToken', () => {
      it('should set "read" or "write" values', () => {
        mount({
          activeApiToken: {
            ...newToken,
            read: false,
          },
        });
        CredentialsLogic.actions.setTokenReadWrite({ name: 'read', checked: true });
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          read: true,
        });
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setTokenReadWrite({ name: 'read', checked: true });
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
      });
    });
  });

  describe('setTokenName', () => {
    describe('activeApiToken', () => {
      it('update the name property on the activeApiToken, formatted correctly', () => {
        mount({
          activeApiToken: {
            ...newToken,
            name: 'bar',
          },
        });
        CredentialsLogic.actions.setTokenName('New Name');
        expect(CredentialsLogic.values.activeApiToken).toEqual({
          ...newToken,
          name: 'new-name',
        });
      });
    });

    describe('activeApiTokenRawName', () => {
      it('updates the raw name, with no formatting applied', () => {
        mount();
        CredentialsLogic.actions.setTokenName('New Name');
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual('New Name');
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setTokenName('New Name');
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
      });
    });
  });

  describe('setTokenType', () => {
    describe('activeApiToken.access_all_engines', () => {
      describe('when value is ADMIN', () => {
        it('updates access_all_engines to false', () => {
          mount({
            activeApiToken: {
              ...newToken,
              access_all_engines: true,
            },
          });
          CredentialsLogic.actions.setTokenType(ADMIN);
          expect(CredentialsLogic.values.activeApiToken.access_all_engines).toEqual(false);
        });
      });

      describe('when value is not ADMIN', () => {
        it('will maintain access_all_engines value when true', () => {
          mount({
            activeApiToken: {
              ...newToken,
              access_all_engines: true,
            },
          });
          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values.activeApiToken.access_all_engines).toEqual(true);
        });

        it('will maintain access_all_engines value when false', () => {
          mount({
            activeApiToken: {
              ...newToken,
              access_all_engines: false,
            },
          });
          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values.activeApiToken.access_all_engines).toEqual(false);
        });
      });
    });

    describe('activeApiToken.engines', () => {
      describe('when value is ADMIN', () => {
        it('clears the array', () => {
          mount({
            activeApiToken: {
              ...newToken,
              engines: [{}, {}],
            },
          });
          CredentialsLogic.actions.setTokenType(ADMIN);
          expect(CredentialsLogic.values.activeApiToken.engines).toEqual([]);
        });
      });

      describe('when value is not ADMIN', () => {
        it('will maintain engines array', () => {
          mount({
            activeApiToken: {
              ...newToken,
              engines: [{}, {}],
            },
          });
          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values.activeApiToken.engines).toEqual([{}, {}]);
        });
      });
    });

    describe('activeApiToken.write', () => {
      describe('when value is PRIVATE', () => {
        it('sets this to true', () => {
          mount({
            activeApiToken: {
              ...newToken,
              write: false,
            },
          });
          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values.activeApiToken.write).toEqual(true);
        });
      });

      describe('when value is not PRIVATE', () => {
        it('sets this to false', () => {
          mount({
            activeApiToken: {
              ...newToken,
              write: true,
            },
          });
          CredentialsLogic.actions.setTokenType(ADMIN);
          expect(CredentialsLogic.values.activeApiToken.write).toEqual(false);
        });
      });
    });

    describe('activeApiToken.read', () => {
      describe('when value is PRIVATE', () => {
        it('sets this to true', () => {
          mount({
            activeApiToken: {
              ...newToken,
              read: false,
            },
          });
          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values.activeApiToken.read).toEqual(true);
        });
      });

      describe('when value is not PRIVATE', () => {
        it('sets this to false', () => {
          mount({
            activeApiToken: {
              ...newToken,
              read: true,
            },
          });
          CredentialsLogic.actions.setTokenType(ADMIN);
          expect(CredentialsLogic.values.activeApiToken.read).toEqual(false);
        });
      });
    });

    describe('activeApiToken.type', () => {
      it('sets the type value', () => {
        mount({
          activeApiToken: {
            ...newToken,
            type: ADMIN,
          },
        });
        CredentialsLogic.actions.setTokenType(PRIVATE);
        expect(CredentialsLogic.values.activeApiToken.type).toEqual(PRIVATE);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.setTokenType(PRIVATE);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
      });
    });
  });

  describe('toggleCredentialsForm', () => {
    describe('showCredentialsForm', () => {
      it('should toggle `showCredentialsForm`', () => {
        mount({
          showCredentialsForm: false,
        });

        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.showCredentialsForm).toEqual(true);

        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.showCredentialsForm).toEqual(false);
      });
    });

    describe('formErrors', () => {
      it('should reset `formErrors`', () => {
        mount({
          formErrors: ['I am an error'],
        });

        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.formErrors).toEqual([]);
      });
    });

    describe('activeApiTokenRawName', () => {
      it('should set `activeApiTokenRawName` to the name of the provided token', () => {
        mount();
        CredentialsLogic.actions.toggleCredentialsForm(newToken);
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual('myToken');
      });

      it('should set `activeApiTokenRawName` to the default value if no token is provided', () => {
        mount();
        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual(
          DEFAULT_VALUES.activeApiTokenRawName
        );
      });

      // TODO: This fails, is this an issue? Instead of reseting back to the default value, it sets it to the previously
      // used value... to be honest, this should probably just be a selector
      // it('should set `activeApiTokenRawName` back to the default value if no token is provided', () => {
      //   mount();
      //   CredentialsLogic.actions.toggleCredentialsForm(newToken);
      //   CredentialsLogic.actions.toggleCredentialsForm();
      //   expect(CredentialsLogic.values.activeApiTokenRawName).toEqual(
      //     DEFAULT_VALUES.activeApiTokenRawName
      //   );
      // });
    });

    describe('activeApiToken', () => {
      it('should set `activeApiToken` to the provided token', () => {
        mount();
        CredentialsLogic.actions.toggleCredentialsForm(newToken);
        expect(CredentialsLogic.values.activeApiToken).toEqual(newToken);
      });

      it('should set `activeApiToken` to the default value if no token is provided', () => {
        mount({
          activeApiToken: newToken,
        });
        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.activeApiToken).toEqual(DEFAULT_VALUES.activeApiToken);
      });
    });

    // TODO: This should probably just be a selector...
    describe('activeApiTokenIsExisting', () => {
      it('should set `activeApiTokenIsExisting` to true when the provided token has an id', () => {
        mount({
          activeApiTokenIsExisting: false,
        });
        CredentialsLogic.actions.toggleCredentialsForm(newToken);
        expect(CredentialsLogic.values.activeApiTokenIsExisting).toEqual(true);
      });

      it('should set `activeApiTokenIsExisting` to false when the provided token has no id', () => {
        mount({
          activeApiTokenIsExisting: true,
        });
        const { id, ...newTokenWithoutId } = newToken;
        CredentialsLogic.actions.toggleCredentialsForm(newTokenWithoutId);
        expect(CredentialsLogic.values.activeApiTokenIsExisting).toEqual(false);
      });

      it('should set `activeApiTokenIsExisting` to false when no token is provided', () => {
        mount({
          activeApiTokenIsExisting: true,
        });
        CredentialsLogic.actions.toggleCredentialsForm();
        expect(CredentialsLogic.values.activeApiTokenIsExisting).toEqual(false);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.toggleCredentialsForm(newToken);
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeApiTokenIsExisting: expect.any(Boolean),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        formErrors: expect.any(Array),
        showCredentialsForm: expect.any(Boolean),
      });
    });
  });

  describe('hideCredentialsForm', () => {
    describe('activeApiTokenRawName', () => {
      it('resets this value', () => {
        mount({
          activeApiTokenRawName: 'foo',
        });
        CredentialsLogic.actions.hideCredentialsForm();
        expect(CredentialsLogic.values.activeApiTokenRawName).toEqual('');
      });
    });

    describe('showCredentialsForm', () => {
      it('resets this value', () => {
        mount({
          showCredentialsForm: true,
        });
        CredentialsLogic.actions.hideCredentialsForm();
        expect(CredentialsLogic.values.showCredentialsForm).toEqual(false);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.hideCredentialsForm();
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        showCredentialsForm: expect.any(Boolean),
        activeApiTokenRawName: expect.any(String),
      });
    });
  });

  describe('resetCredentials', () => {
    describe('isCredentialsDetailsComplete', () => {
      it('should reset to false', () => {
        mount({
          isCredentialsDetailsComplete: true,
        });
        CredentialsLogic.actions.resetCredentials();
        expect(CredentialsLogic.values.isCredentialsDetailsComplete).toEqual(false);
      });
    });

    describe('isCredentialsDataComplete', () => {
      it('should reset to false', () => {
        mount({
          isCredentialsDataComplete: true,
        });
        CredentialsLogic.actions.resetCredentials();
        expect(CredentialsLogic.values.isCredentialsDataComplete).toEqual(false);
      });
    });

    describe('formErrors', () => {
      it('should reset', () => {
        mount({
          formErrors: ['I am an error'],
        });
        CredentialsLogic.actions.resetCredentials();
        expect(CredentialsLogic.values.formErrors).toEqual([]);
      });
    });

    it('should not change any other values', () => {
      mount();
      CredentialsLogic.actions.resetCredentials();
      expect(CredentialsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        isCredentialsDetailsComplete: expect.any(Boolean),
        isCredentialsDataComplete: expect.any(Boolean),
        formErrors: expect.any(Array),
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
