/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../shared/constants';

jest.mock('../../app_logic', () => ({
  AppLogic: {
    selectors: { myRole: jest.fn(() => ({})) },
  },
}));
import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';
import { AppLogic } from '../../app_logic';

import { EngineTypes } from '../engine/types';

import { ApiTokenTypes } from './constants';

import { CredentialsLogic } from './credentials_logic';

describe('CredentialsLogic', () => {
  const { mount } = new LogicMounter(CredentialsLogic);
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    activeApiToken: {
      name: '',
      type: ApiTokenTypes.Private,
      read: true,
      write: true,
      access_all_engines: true,
    },
    activeApiTokenExists: false,
    activeApiTokenRawName: '',
    apiTokens: [],
    dataLoading: true,
    engines: [],
    formErrors: [],
    isCredentialsDataComplete: false,
    isCredentialsDetailsComplete: false,
    meta: DEFAULT_META,
    nameInputBlurred: false,
    shouldShowCredentialsForm: false,
    fullEngineAccessChecked: false,
  };

  const newToken = {
    id: 1,
    name: 'myToken',
    type: ApiTokenTypes.Private,
    read: true,
    write: true,
    access_all_engines: true,
    engines: [],
  };

  const credentialsDetails = {
    engines: [
      { name: 'engine1', type: EngineTypes.indexed, language: 'english', result_fields: {} },
      { name: 'engine1', type: EngineTypes.indexed, language: 'english', result_fields: {} },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CredentialsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('addEngineName', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenExists: expect.any(Boolean),
      };

      describe('activeApiToken', () => {
        it("should add an engine to the active api token's engine list", () => {
          mount({
            activeApiToken: {
              ...newToken,
              engines: ['someEngine'],
            },
          });

          CredentialsLogic.actions.addEngineName('newEngine');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, engines: ['someEngine', 'newEngine'] },
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
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, engines: ['newEngine'] },
          });
        });
      });
    });

    describe('removeEngineName', () => {
      describe('activeApiToken', () => {
        const values = {
          ...DEFAULT_VALUES,
          activeApiToken: expect.any(Object),
          activeApiTokenExists: expect.any(Boolean),
        };

        it("should remove an engine from the active api token's engine list", () => {
          mount({
            activeApiToken: {
              ...newToken,
              engines: ['someEngine', 'anotherEngine'],
            },
          });

          CredentialsLogic.actions.removeEngineName('someEngine');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, engines: ['anotherEngine'] },
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
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, engines: ['someEngine', 'anotherEngine'] },
          });
        });

        it('does not throw a type error if no engines are stored in state', () => {
          mount({
            activeApiToken: {},
          });
          CredentialsLogic.actions.removeEngineName('');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { engines: [] },
          });
        });
      });
    });

    describe('setAccessAllEngines', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenExists: expect.any(Boolean),
      };

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
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, engines: [], access_all_engines: true },
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
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: {
              ...newToken,
              access_all_engines: false,
              engines: ['someEngine', 'anotherEngine'],
            },
          });
        });
      });
    });

    describe('onApiTokenCreateSuccess', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiTokenExists: expect.any(Boolean),
        apiTokens: expect.any(Array),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        shouldShowCredentialsForm: expect.any(Boolean),
        formErrors: expect.any(Array),
      };

      describe('apiTokens', () => {
        const existingToken = {
          name: 'some_token',
          type: ApiTokenTypes.Private,
        };

        it('should add the provided token to the apiTokens list', () => {
          mount({
            apiTokens: [existingToken],
          });

          CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [existingToken, newToken],
          });
        });
      });

      describe('activeApiToken', () => {
        it('should reset to the default value, which effectively clears out the current form', () => {
          mount({
            activeApiToken: newToken,
          });

          CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: DEFAULT_VALUES.activeApiToken,
          });
        });
      });

      describe('activeApiTokenRawName', () => {
        it('should reset to the default value, which effectively clears out the current form', () => {
          mount({
            activeApiTokenRawName: 'foo',
          });

          CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName,
          });
        });
      });

      describe('shouldShowCredentialsForm', () => {
        it('should reset to the default value, which closes the credentials form', () => {
          mount({
            shouldShowCredentialsForm: true,
          });

          CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            shouldShowCredentialsForm: false,
          });
        });
      });

      describe('formErrors', () => {
        it('should reset `formErrors`', () => {
          mount({
            formErrors: ['I am an error'],
          });

          CredentialsLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            formErrors: [],
          });
        });
      });
    });

    describe('onApiTokenError', () => {
      const values = {
        ...DEFAULT_VALUES,
        formErrors: expect.any(Array),
      };

      describe('formErrors', () => {
        it('should set `formErrors`', () => {
          mount({
            formErrors: ['I am an error'],
          });

          CredentialsLogic.actions.onApiTokenError(['I am the NEW error']);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            formErrors: ['I am the NEW error'],
          });
        });
      });
    });

    describe('onApiTokenUpdateSuccess', () => {
      const values = {
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        shouldShowCredentialsForm: expect.any(Boolean),
      };

      describe('apiTokens', () => {
        const existingToken = {
          name: 'some_token',
          type: ApiTokenTypes.Private,
        };

        it('should replace the existing token with the new token by name', () => {
          mount({
            apiTokens: [newToken, existingToken],
          });
          const updatedExistingToken = {
            ...existingToken,
            type: ApiTokenTypes.Admin,
          };

          CredentialsLogic.actions.onApiTokenUpdateSuccess(updatedExistingToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [newToken, updatedExistingToken],
          });
        });

        // TODO Not sure if this is a good behavior or not
        it('if for some reason the existing token is not found, it adds a new token...', () => {
          mount({
            apiTokens: [newToken, existingToken],
          });
          const brandNewToken = {
            name: 'brand new token',
            type: ApiTokenTypes.Admin,
          };

          CredentialsLogic.actions.onApiTokenUpdateSuccess(brandNewToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [newToken, existingToken, brandNewToken],
          });
        });
      });

      describe('activeApiToken', () => {
        it('should reset to the default value, which effectively clears out the current form', () => {
          mount({
            activeApiToken: newToken,
          });

          CredentialsLogic.actions.onApiTokenUpdateSuccess({
            ...newToken,
            type: ApiTokenTypes.Admin,
          });
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: DEFAULT_VALUES.activeApiToken,
          });
        });
      });

      describe('activeApiTokenRawName', () => {
        it('should reset to the default value, which effectively clears out the current form', () => {
          mount({
            activeApiTokenRawName: 'foo',
          });

          CredentialsLogic.actions.onApiTokenUpdateSuccess({
            ...newToken,
            type: ApiTokenTypes.Admin,
          });
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName,
          });
        });
      });

      describe('shouldShowCredentialsForm', () => {
        it('should reset to the default value, which closes the credentials form', () => {
          mount({
            shouldShowCredentialsForm: true,
          });

          CredentialsLogic.actions.onApiTokenUpdateSuccess({
            ...newToken,
            type: ApiTokenTypes.Admin,
          });
          expect(CredentialsLogic.values).toEqual({
            ...values,
            shouldShowCredentialsForm: false,
          });
        });
      });
    });

    describe('setCredentialsData', () => {
      const meta = {
        page: {
          current: 1,
          size: 1,
          total_pages: 1,
          total_results: 1,
        },
      };

      const values = {
        ...DEFAULT_VALUES,
        dataLoading: false,
        apiTokens: expect.any(Array),
        meta: expect.any(Object),
        isCredentialsDataComplete: expect.any(Boolean),
      };

      describe('apiTokens', () => {
        it('should be set', () => {
          mount();

          CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [newToken, newToken],
          });
        });
      });

      describe('meta', () => {
        it('should be set', () => {
          mount();

          CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            meta,
          });
        });
      });

      describe('isCredentialsDataComplete', () => {
        it('should be set to true so we know that data fetching has completed', () => {
          mount({
            isCredentialsDataComplete: false,
          });

          CredentialsLogic.actions.setCredentialsData(meta, [newToken, newToken]);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            isCredentialsDataComplete: true,
          });
        });
      });
    });

    describe('setCredentialsDetails', () => {
      const values = {
        ...DEFAULT_VALUES,
        dataLoading: false,
        engines: expect.any(Array),
        isCredentialsDetailsComplete: expect.any(Boolean),
      };

      describe('isCredentialsDataComplete', () => {
        it('should be set to true so that we know data fetching has been completed', () => {
          mount({
            isCredentialsDetailsComplete: false,
          });

          CredentialsLogic.actions.setCredentialsDetails(credentialsDetails);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            isCredentialsDetailsComplete: true,
          });
        });
      });

      describe('engines', () => {
        it('should set `engines` from the provided details object', () => {
          mount({
            engines: [],
          });

          CredentialsLogic.actions.setCredentialsDetails(credentialsDetails);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            engines: credentialsDetails.engines,
          });
        });
      });
    });

    describe('setNameInputBlurred', () => {
      const values = {
        ...DEFAULT_VALUES,
        nameInputBlurred: expect.any(Boolean),
      };

      describe('nameInputBlurred', () => {
        it('should set this value', () => {
          mount({
            nameInputBlurred: false,
          });

          CredentialsLogic.actions.setNameInputBlurred(true);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            nameInputBlurred: true,
          });
        });
      });
    });

    describe('setTokenReadWrite', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenExists: expect.any(Boolean),
      };

      describe('activeApiToken', () => {
        it('should set "read" or "write" values', () => {
          mount({
            activeApiToken: {
              ...newToken,
              read: false,
            },
          });

          CredentialsLogic.actions.setTokenReadWrite({ name: 'read', checked: true });
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: {
              ...newToken,
              read: true,
            },
          });
        });
      });
    });

    describe('setTokenName', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        activeApiTokenExists: expect.any(Boolean),
      };

      describe('activeApiToken', () => {
        it('update the name property on the activeApiToken, formatted correctly', () => {
          mount({
            activeApiToken: {
              ...newToken,
              name: 'bar',
            },
          });

          CredentialsLogic.actions.setTokenName('New Name');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, name: 'new-name' },
          });
        });
      });

      describe('activeApiTokenRawName', () => {
        it('updates the raw name, with no formatting applied', () => {
          mount();

          CredentialsLogic.actions.setTokenName('New Name');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: 'New Name',
          });
        });
      });
    });

    describe('setTokenType', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: {
          ...newToken,
          type: expect.any(String),
          read: expect.any(Boolean),
          write: expect.any(Boolean),
          access_all_engines: expect.any(Boolean),
          engines: expect.any(Array),
        },
        activeApiTokenExists: expect.any(Boolean),
      };

      describe('activeApiToken.access_all_engines', () => {
        describe('when value is admin', () => {
          it('updates access_all_engines to false', () => {
            mount({
              activeApiToken: {
                ...newToken,
                access_all_engines: true,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Admin);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: false,
              },
            });
          });
        });

        describe('when value is not admin', () => {
          it('will maintain access_all_engines value when true', () => {
            mount({
              activeApiToken: {
                ...newToken,
                access_all_engines: true,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: true,
              },
            });
          });

          it('will maintain access_all_engines value when false', () => {
            mount({
              activeApiToken: {
                ...newToken,
                access_all_engines: false,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: false,
              },
            });
          });
        });
      });

      describe('activeApiToken.engines', () => {
        describe('when value is admin', () => {
          it('clears the array', () => {
            mount({
              activeApiToken: {
                ...newToken,
                engines: [{}, {}],
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Admin);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                engines: [],
              },
            });
          });
        });

        describe('when value is not admin', () => {
          it('will maintain engines array', () => {
            mount({
              activeApiToken: {
                ...newToken,
                engines: [{}, {}],
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                engines: [{}, {}],
              },
            });
          });
        });
      });

      describe('activeApiToken.write', () => {
        describe('when value is private', () => {
          it('sets this to true', () => {
            mount({
              activeApiToken: {
                ...newToken,
                write: false,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                write: true,
              },
            });
          });
        });

        describe('when value is not private', () => {
          it('sets this to false', () => {
            mount({
              activeApiToken: {
                ...newToken,
                write: true,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Admin);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                write: false,
              },
            });
          });
        });
      });

      describe('activeApiToken.read', () => {
        describe('when value is private', () => {
          it('sets this to true', () => {
            mount({
              activeApiToken: {
                ...newToken,
                read: false,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                read: true,
              },
            });
          });
        });

        describe('when value is not private', () => {
          it('sets this to false', () => {
            mount({
              activeApiToken: {
                ...newToken,
                read: true,
              },
            });

            CredentialsLogic.actions.setTokenType(ApiTokenTypes.Admin);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                read: false,
              },
            });
          });
        });
      });

      describe('activeApiToken.type', () => {
        it('sets the type value', () => {
          mount({
            activeApiToken: {
              ...newToken,
              type: ApiTokenTypes.Admin,
            },
          });

          CredentialsLogic.actions.setTokenType(ApiTokenTypes.Private);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: {
              ...values.activeApiToken,
              type: ApiTokenTypes.Private,
            },
          });
        });
      });
    });

    describe('showCredentialsForm', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiTokenExists: expect.any(Boolean),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        formErrors: expect.any(Array),
        shouldShowCredentialsForm: expect.any(Boolean),
      };

      describe('shouldShowCredentialsForm', () => {
        it('should toggle `shouldShowCredentialsForm`', () => {
          mount({
            shouldShowCredentialsForm: false,
          });

          CredentialsLogic.actions.showCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            shouldShowCredentialsForm: true,
          });
        });
      });

      describe('formErrors', () => {
        it('should reset `formErrors`', () => {
          mount({
            formErrors: ['I am an error'],
          });

          CredentialsLogic.actions.showCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            formErrors: [],
          });
        });
      });

      describe('activeApiTokenRawName', () => {
        it('should set `activeApiTokenRawName` to the name of the provided token', () => {
          mount({
            activeApiTokenRawName: 'Some Name',
          });

          CredentialsLogic.actions.showCredentialsForm(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: 'myToken',
          });
        });

        it('should set `activeApiTokenRawName` to the default value if no token is provided', () => {
          mount({
            activeApiTokenRawName: 'Some Name',
          });

          CredentialsLogic.actions.showCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName,
          });
        });
      });

      describe('activeApiToken', () => {
        it('should set `activeApiToken` to the provided token', () => {
          mount();

          CredentialsLogic.actions.showCredentialsForm(newToken);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: newToken,
          });
        });

        it('should set `activeApiToken` to the default value if no token is provided', () => {
          mount({
            activeApiToken: newToken,
          });

          CredentialsLogic.actions.showCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: DEFAULT_VALUES.activeApiToken,
          });
        });
      });

      describe('listener side-effects', () => {
        it('should clear flashMessages whenever the credentials form flyout is opened', () => {
          CredentialsLogic.actions.showCredentialsForm();
          expect(clearFlashMessages).toHaveBeenCalled();
        });
      });
    });

    describe('hideCredentialsForm', () => {
      const values = {
        ...DEFAULT_VALUES,
        shouldShowCredentialsForm: expect.any(Boolean),
        activeApiTokenRawName: expect.any(String),
      };

      describe('activeApiTokenRawName', () => {
        it('resets this value', () => {
          mount({
            activeApiTokenRawName: 'foo',
          });

          CredentialsLogic.actions.hideCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: '',
          });
        });
      });

      describe('shouldShowCredentialsForm', () => {
        it('resets this value', () => {
          mount({
            shouldShowCredentialsForm: true,
          });

          CredentialsLogic.actions.hideCredentialsForm();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            shouldShowCredentialsForm: false,
          });
        });
      });
    });

    describe('resetCredentials', () => {
      const values = {
        ...DEFAULT_VALUES,
        isCredentialsDetailsComplete: expect.any(Boolean),
        isCredentialsDataComplete: expect.any(Boolean),
        formErrors: expect.any(Array),
      };

      describe('isCredentialsDetailsComplete', () => {
        it('should reset to false', () => {
          mount({
            isCredentialsDetailsComplete: true,
          });

          CredentialsLogic.actions.resetCredentials();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            isCredentialsDetailsComplete: false,
          });
        });
      });

      describe('isCredentialsDataComplete', () => {
        it('should reset to false', () => {
          mount({
            isCredentialsDataComplete: true,
          });

          CredentialsLogic.actions.resetCredentials();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            isCredentialsDataComplete: false,
          });
        });
      });

      describe('formErrors', () => {
        it('should reset', () => {
          mount({
            formErrors: ['I am an error'],
          });

          CredentialsLogic.actions.resetCredentials();
          expect(CredentialsLogic.values).toEqual({
            ...values,
            formErrors: [],
          });
        });
      });
    });

    describe('onPaginate', () => {
      it('should set meta.page.current', () => {
        mount({ meta: DEFAULT_META });

        CredentialsLogic.actions.onPaginate(5);
        expect(CredentialsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            page: {
              ...DEFAULT_META.page,
              current: 5,
            },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCredentials', () => {
      const meta = {
        page: {
          current: 1,
          size: 1,
          total_pages: 1,
          total_results: 1,
        },
      };
      const results: object[] = [];

      it('will call an API endpoint and set the results with the `setCredentialsData` action', async () => {
        mount();
        jest.spyOn(CredentialsLogic.actions, 'setCredentialsData').mockImplementationOnce(() => {});
        http.get.mockReturnValue(Promise.resolve({ meta, results }));

        CredentialsLogic.actions.fetchCredentials();
        expect(http.get).toHaveBeenCalledWith('/internal/app_search/credentials', {
          query: {
            'page[current]': 1,
            'page[size]': 10,
          },
        });
        await nextTick();
        expect(CredentialsLogic.actions.setCredentialsData).toHaveBeenCalledWith(meta, results);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        CredentialsLogic.actions.fetchCredentials();
      });
    });

    describe('fetchDetails', () => {
      it('will call an API endpoint and set the results with the `setCredentialsDetails` action', async () => {
        mount();
        jest
          .spyOn(CredentialsLogic.actions, 'setCredentialsDetails')
          .mockImplementationOnce(() => {});
        http.get.mockReturnValue(Promise.resolve(credentialsDetails));

        CredentialsLogic.actions.fetchDetails();
        expect(http.get).toHaveBeenCalledWith('/internal/app_search/credentials/details');
        await nextTick();
        expect(CredentialsLogic.actions.setCredentialsDetails).toHaveBeenCalledWith(
          credentialsDetails
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        CredentialsLogic.actions.fetchDetails();
      });
    });

    describe('deleteApiKey', () => {
      const tokenName = 'abc123';

      it('will call an API endpoint and re-fetch the credentials list', async () => {
        mount();
        jest.spyOn(CredentialsLogic.actions, 'fetchCredentials').mockImplementationOnce(() => {});
        http.delete.mockReturnValue(Promise.resolve());

        CredentialsLogic.actions.deleteApiKey(tokenName);
        expect(http.delete).toHaveBeenCalledWith(`/internal/app_search/credentials/${tokenName}`);
        await nextTick();

        expect(CredentialsLogic.actions.fetchCredentials).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        mount();
        CredentialsLogic.actions.deleteApiKey(tokenName);
      });
    });

    describe('onApiTokenChange', () => {
      it('calls a POST API endpoint that creates a new token if the active token does not exist yet', async () => {
        const createdToken = {
          name: 'new-key',
          type: ApiTokenTypes.Admin,
        };
        mount({
          activeApiToken: createdToken,
        });
        jest.spyOn(CredentialsLogic.actions, 'onApiTokenCreateSuccess');
        http.post.mockReturnValue(Promise.resolve(createdToken));

        CredentialsLogic.actions.onApiTokenChange();
        expect(http.post).toHaveBeenCalledWith('/internal/app_search/credentials', {
          body: JSON.stringify(createdToken),
        });
        await nextTick();
        expect(CredentialsLogic.actions.onApiTokenCreateSuccess).toHaveBeenCalledWith(createdToken);
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      it('calls a PUT endpoint that updates the active token if it already exists', async () => {
        const updatedToken = {
          name: 'test-key',
          type: ApiTokenTypes.Private,
          read: true,
          write: false,
          access_all_engines: false,
          engines: ['engine1'],
        };
        mount({
          activeApiToken: {
            ...updatedToken,
            id: 'some-id',
          },
        });
        jest.spyOn(CredentialsLogic.actions, 'onApiTokenUpdateSuccess');
        http.put.mockReturnValue(Promise.resolve(updatedToken));

        CredentialsLogic.actions.onApiTokenChange();
        expect(http.put).toHaveBeenCalledWith('/internal/app_search/credentials/test-key', {
          body: JSON.stringify(updatedToken),
        });
        await nextTick();
        expect(CredentialsLogic.actions.onApiTokenUpdateSuccess).toHaveBeenCalledWith(updatedToken);
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        mount();
        CredentialsLogic.actions.onApiTokenChange();
      });

      describe('token type data', () => {
        it('does not send extra read/write/engine access data for admin tokens', () => {
          const correctAdminToken = {
            name: 'bogus-admin',
            type: ApiTokenTypes.Admin,
          };
          const extraData = {
            read: true,
            write: true,
            access_all_engines: true,
          };
          mount({ activeApiToken: { ...correctAdminToken, ...extraData } });

          CredentialsLogic.actions.onApiTokenChange();
          expect(http.post).toHaveBeenCalledWith('/internal/app_search/credentials', {
            body: JSON.stringify(correctAdminToken),
          });
        });

        it('does not send extra read/write access data for search tokens', () => {
          const correctSearchToken = {
            name: 'bogus-search',
            type: ApiTokenTypes.Search,
            access_all_engines: false,
            engines: ['some-engine'],
          };
          const extraData = {
            read: true,
            write: false,
          };
          mount({ activeApiToken: { ...correctSearchToken, ...extraData } });

          CredentialsLogic.actions.onApiTokenChange();
          expect(http.post).toHaveBeenCalledWith('/internal/app_search/credentials', {
            body: JSON.stringify(correctSearchToken),
          });
        });

        // Private tokens send all data per the PUT test above.
        // If that ever changes, we should capture that in another test here.
      });
    });

    describe('onEngineSelect', () => {
      it('calls addEngineName if the engine is not selected', () => {
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            engines: [],
          },
        });
        jest.spyOn(CredentialsLogic.actions, 'addEngineName');

        CredentialsLogic.actions.onEngineSelect('engine1');
        expect(CredentialsLogic.actions.addEngineName).toHaveBeenCalledWith('engine1');
        expect(CredentialsLogic.values.activeApiToken.engines).toEqual(['engine1']);
      });

      it('calls removeEngineName if the engine is already selected', () => {
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            engines: ['engine1', 'engine2'],
          },
        });
        jest.spyOn(CredentialsLogic.actions, 'removeEngineName');

        CredentialsLogic.actions.onEngineSelect('engine1');
        expect(CredentialsLogic.actions.removeEngineName).toHaveBeenCalledWith('engine1');
        expect(CredentialsLogic.values.activeApiToken.engines).toEqual(['engine2']);
      });
    });
  });

  describe('selectors', () => {
    describe('fullEngineAccessChecked', () => {
      it('should be true if active token is set to access all engines and the user can access all engines', () => {
        (AppLogic.selectors.myRole as jest.Mock).mockReturnValueOnce({
          canAccessAllEngines: true,
        });
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            access_all_engines: true,
          },
        });

        expect(CredentialsLogic.values.fullEngineAccessChecked).toEqual(true);
      });

      it('should be false if the token is not set to access all engines', () => {
        (AppLogic.selectors.myRole as jest.Mock).mockReturnValueOnce({
          canAccessAllEngines: true,
        });
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            access_all_engines: false,
          },
        });

        expect(CredentialsLogic.values.fullEngineAccessChecked).toEqual(false);
      });

      it('should be false if the user cannot acess all engines', () => {
        (AppLogic.selectors.myRole as jest.Mock).mockReturnValueOnce({
          canAccessAllEngines: false,
        });
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            access_all_engines: true,
          },
        });

        expect(CredentialsLogic.values.fullEngineAccessChecked).toEqual(false);
      });
    });

    describe('activeApiTokenExists', () => {
      it('should be false if the token has no id', () => {
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            id: undefined,
          },
        });

        expect(CredentialsLogic.values.activeApiTokenExists).toEqual(false);
      });

      it('should be true if the token has an id', () => {
        mount({
          activeApiToken: {
            ...DEFAULT_VALUES.activeApiToken,
            id: '123',
          },
        });

        expect(CredentialsLogic.values.activeApiTokenExists).toEqual(true);
      });
    });
  });
});
