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

describe('CredentialsLogic', () => {
  const DEFAULT_VALUES = {
    activeApiToken: {
      name: '',
      type: PRIVATE,
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
    meta: {},
    nameInputBlurred: false,
    shouldShowCredentialsForm: false,
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

  const newToken = {
    id: 1,
    name: 'myToken',
    type: PRIVATE,
    read: true,
    write: true,
    access_all_engines: true,
    engines: [],
  };

  const credentialsDetails = {
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

    describe('onApiKeyDelete', () => {
      const values = {
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
      };

      describe('apiTokens', () => {
        it('should remove specified token from apiTokens if name matches', () => {
          mount({
            apiTokens: [newToken],
          });

          CredentialsLogic.actions.onApiKeyDelete(newToken.name);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [],
          });
        });

        it('should not remove specified token from apiTokens if name does not match', () => {
          mount({
            apiTokens: [newToken],
          });

          CredentialsLogic.actions.onApiKeyDelete('foo');
          expect(CredentialsLogic.values).toEqual({
            ...values,
            apiTokens: [newToken],
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
          type: PRIVATE,
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
            type: ADMIN,
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

          CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
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

          CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
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

          CredentialsLogic.actions.onApiTokenUpdateSuccess({ ...newToken, type: ADMIN });
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
        describe('when value is ADMIN', () => {
          it('updates access_all_engines to false', () => {
            mount({
              activeApiToken: {
                ...newToken,
                access_all_engines: true,
              },
            });

            CredentialsLogic.actions.setTokenType(ADMIN);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                access_all_engines: false,
              },
            });
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

            CredentialsLogic.actions.setTokenType(PRIVATE);
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
        describe('when value is ADMIN', () => {
          it('clears the array', () => {
            mount({
              activeApiToken: {
                ...newToken,
                engines: [{}, {}],
              },
            });

            CredentialsLogic.actions.setTokenType(ADMIN);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                engines: [],
              },
            });
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
        describe('when value is PRIVATE', () => {
          it('sets this to true', () => {
            mount({
              activeApiToken: {
                ...newToken,
                write: false,
              },
            });

            CredentialsLogic.actions.setTokenType(PRIVATE);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                write: true,
              },
            });
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
        describe('when value is PRIVATE', () => {
          it('sets this to true', () => {
            mount({
              activeApiToken: {
                ...newToken,
                read: false,
              },
            });

            CredentialsLogic.actions.setTokenType(PRIVATE);
            expect(CredentialsLogic.values).toEqual({
              ...values,
              activeApiToken: {
                ...values.activeApiToken,
                read: true,
              },
            });
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
              type: ADMIN,
            },
          });

          CredentialsLogic.actions.setTokenType(PRIVATE);
          expect(CredentialsLogic.values).toEqual({
            ...values,
            activeApiToken: {
              ...values.activeApiToken,
              type: PRIVATE,
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
        const promise = Promise.resolve({ meta, results });
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.fetchCredentials(2);
        expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/app_search/credentials', {
          query: {
            'page[current]': 2,
          },
        });
        await promise;
        expect(CredentialsLogic.actions.setCredentialsData).toHaveBeenCalledWith(meta, results);
      });

      it('handles errors', async () => {
        mount();
        const promise = Promise.reject('An error occured');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.fetchCredentials();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        }
      });
    });

    describe('fetchDetails', () => {
      it('will call an API endpoint and set the results with the `setCredentialsDetails` action', async () => {
        mount();
        jest
          .spyOn(CredentialsLogic.actions, 'setCredentialsDetails')
          .mockImplementationOnce(() => {});
        const promise = Promise.resolve(credentialsDetails);
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.fetchDetails();
        expect(HttpLogic.values.http.get).toHaveBeenCalledWith(
          '/api/app_search/credentials/details'
        );
        await promise;
        expect(CredentialsLogic.actions.setCredentialsDetails).toHaveBeenCalledWith(
          credentialsDetails
        );
      });

      it('handles errors', async () => {
        mount();
        const promise = Promise.reject('An error occured');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.fetchDetails();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        }
      });
    });

    describe('deleteApiKey', () => {
      const tokenName = 'abc123';

      it('will call an API endpoint and set the results with the `onApiKeyDelete` action', async () => {
        mount();
        jest.spyOn(CredentialsLogic.actions, 'onApiKeyDelete').mockImplementationOnce(() => {});
        const promise = Promise.resolve();
        (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.deleteApiKey(tokenName);
        expect(HttpLogic.values.http.delete).toHaveBeenCalledWith(
          `/api/app_search/credentials/${tokenName}`
        );
        await promise;
        expect(CredentialsLogic.actions.onApiKeyDelete).toHaveBeenCalledWith(tokenName);
      });

      it('handles errors', async () => {
        mount();
        const promise = Promise.reject('An error occured');
        (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(promise);

        CredentialsLogic.actions.deleteApiKey(tokenName);
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        }
      });
    });
  });

  describe('selectors', () => {
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
