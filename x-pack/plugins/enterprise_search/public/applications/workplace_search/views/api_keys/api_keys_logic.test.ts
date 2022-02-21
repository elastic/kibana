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
import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { ApiKeysLogic } from './api_keys_logic';

describe('ApiKeysLogic', () => {
  const { mount } = new LogicMounter(ApiKeysLogic);
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    apiTokens: [],
    meta: DEFAULT_META,
    nameInputBlurred: false,
    activeApiToken: {
      name: '',
    },
    activeApiTokenRawName: '',
    apiKeyFormVisible: false,
    apiTokenNameToDelete: '',
    deleteModalVisible: false,
    formErrors: [],
  };

  const newToken = {
    id: '1',
    name: 'myToken',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ApiKeysLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onApiTokenCreateSuccess', () => {
      const values = {
        ...DEFAULT_VALUES,
        apiTokens: expect.any(Array),
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        apiKeyFormVisible: expect.any(Boolean),
        formErrors: expect.any(Array),
      };

      describe('apiTokens', () => {
        const existingToken = {
          name: 'some_token',
        };

        it('should add the provided token to the apiTokens list', () => {
          mount({
            apiTokens: [existingToken],
          });

          ApiKeysLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(ApiKeysLogic.values).toEqual({
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

          ApiKeysLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(ApiKeysLogic.values).toEqual({
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

          ApiKeysLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: DEFAULT_VALUES.activeApiTokenRawName,
          });
        });
      });

      describe('apiKeyFormVisible', () => {
        it('should reset to the default value, which closes the api key form', () => {
          mount({
            apiKeyFormVisible: true,
          });

          ApiKeysLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            apiKeyFormVisible: false,
          });
        });
      });

      describe('deleteModalVisible', () => {
        const tokenName = 'my-token';

        it('should set deleteModalVisible to true and set apiTokenNameToDelete', () => {
          ApiKeysLogic.actions.stageTokenNameForDeletion(tokenName);

          expect(ApiKeysLogic.values).toEqual({
            ...values,
            deleteModalVisible: true,
            apiTokenNameToDelete: tokenName,
          });
        });

        it('should set deleteModalVisible to false and reset apiTokenNameToDelete', () => {
          mount({
            deleteModalVisible: true,
            apiTokenNameToDelete: tokenName,
          });
          ApiKeysLogic.actions.hideDeleteModal();

          expect(ApiKeysLogic.values).toEqual(values);
        });
      });

      describe('formErrors', () => {
        it('should reset `formErrors`', () => {
          mount({
            formErrors: ['I am an error'],
          });

          ApiKeysLogic.actions.onApiTokenCreateSuccess(newToken);
          expect(ApiKeysLogic.values).toEqual({
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

          ApiKeysLogic.actions.onApiTokenError(['I am the NEW error']);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            formErrors: ['I am the NEW error'],
          });
        });
      });
    });

    describe('setApiKeysData', () => {
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
      };

      describe('apiTokens', () => {
        it('should be set', () => {
          mount();

          ApiKeysLogic.actions.setApiKeysData(meta, [newToken, newToken]);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            apiTokens: [newToken, newToken],
          });
        });
      });

      describe('meta', () => {
        it('should be set', () => {
          mount();

          ApiKeysLogic.actions.setApiKeysData(meta, [newToken, newToken]);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            meta,
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

          ApiKeysLogic.actions.setNameInputBlurred(true);
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            nameInputBlurred: true,
          });
        });
      });
    });

    describe('setApiKeyName', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
      };

      describe('activeApiToken', () => {
        it('update the name property on the activeApiToken, formatted correctly', () => {
          mount({
            activeApiToken: {
              ...newToken,
              name: 'bar',
            },
          });

          ApiKeysLogic.actions.setApiKeyName('New Name');
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            activeApiToken: { ...newToken, name: 'new-name' },
          });
        });
      });

      describe('activeApiTokenRawName', () => {
        it('updates the raw name, with no formatting applied', () => {
          mount();

          ApiKeysLogic.actions.setApiKeyName('New Name');
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: 'New Name',
          });
        });
      });
    });

    describe('showApiKeyForm', () => {
      const values = {
        ...DEFAULT_VALUES,
        activeApiToken: expect.any(Object),
        activeApiTokenRawName: expect.any(String),
        formErrors: expect.any(Array),
        apiKeyFormVisible: expect.any(Boolean),
      };

      describe('apiKeyFormVisible', () => {
        it('should toggle `apiKeyFormVisible`', () => {
          mount({
            apiKeyFormVisible: false,
          });

          ApiKeysLogic.actions.showApiKeyForm();
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            apiKeyFormVisible: true,
          });
        });
      });

      describe('formErrors', () => {
        it('should reset `formErrors`', () => {
          mount({
            formErrors: ['I am an error'],
          });

          ApiKeysLogic.actions.showApiKeyForm();
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            formErrors: [],
          });
        });
      });

      describe('listener side-effects', () => {
        it('should clear flashMessages whenever the api key form flyout is opened', () => {
          ApiKeysLogic.actions.showApiKeyForm();
          expect(clearFlashMessages).toHaveBeenCalled();
        });
      });
    });

    describe('hideApiKeyForm', () => {
      const values = {
        ...DEFAULT_VALUES,
        apiKeyFormVisible: expect.any(Boolean),
        activeApiTokenRawName: expect.any(String),
      };

      describe('activeApiTokenRawName', () => {
        it('resets this value', () => {
          mount({
            activeApiTokenRawName: 'foo',
          });

          ApiKeysLogic.actions.hideApiKeyForm();
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            activeApiTokenRawName: '',
          });
        });
      });

      describe('apiKeyFormVisible', () => {
        it('resets this value', () => {
          mount({
            apiKeyFormVisible: true,
          });

          ApiKeysLogic.actions.hideApiKeyForm();
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            apiKeyFormVisible: false,
          });
        });
      });
    });

    describe('resetApiKeys', () => {
      const values = {
        ...DEFAULT_VALUES,
        formErrors: expect.any(Array),
      };

      describe('formErrors', () => {
        it('should reset', () => {
          mount({
            formErrors: ['I am an error'],
          });

          ApiKeysLogic.actions.resetApiKeys();
          expect(ApiKeysLogic.values).toEqual({
            ...values,
            formErrors: [],
          });
        });
      });
    });

    describe('onPaginate', () => {
      it('should set meta.page.current', () => {
        mount({ meta: DEFAULT_META });

        ApiKeysLogic.actions.onPaginate(5);
        expect(ApiKeysLogic.values).toEqual({
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
    describe('fetchApiKeys', () => {
      const meta = {
        page: {
          current: 1,
          size: 1,
          total_pages: 1,
          total_results: 1,
        },
      };
      const results: object[] = [];

      it('will call an API endpoint and set the results with the `setApiKeysData` action', async () => {
        mount();
        jest.spyOn(ApiKeysLogic.actions, 'setApiKeysData').mockImplementationOnce(() => {});
        http.get.mockReturnValue(Promise.resolve({ meta, results }));

        ApiKeysLogic.actions.fetchApiKeys();
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/api_keys', {
          query: {
            'page[current]': 1,
            'page[size]': 10,
          },
        });
        await nextTick();
        expect(ApiKeysLogic.actions.setApiKeysData).toHaveBeenCalledWith(meta, results);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        ApiKeysLogic.actions.fetchApiKeys();
      });
    });

    describe('deleteApiKey', () => {
      const tokenName = 'abc123';

      it('will call an API endpoint and re-fetch the api keys list', async () => {
        mount();
        jest.spyOn(ApiKeysLogic.actions, 'fetchApiKeys').mockImplementationOnce(() => {});
        http.delete.mockReturnValue(Promise.resolve());

        ApiKeysLogic.actions.stageTokenNameForDeletion(tokenName);
        ApiKeysLogic.actions.deleteApiKey();
        expect(http.delete).toHaveBeenCalledWith(
          `/internal/workplace_search/api_keys/${tokenName}`
        );
        await nextTick();

        expect(ApiKeysLogic.actions.fetchApiKeys).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        mount();
        ApiKeysLogic.actions.deleteApiKey();
      });
    });

    describe('onApiFormSubmit', () => {
      it('calls a POST API endpoint that creates a new token if the active token does not exist yet', async () => {
        const createdToken = {
          name: 'new-key',
        };
        mount({
          activeApiToken: createdToken,
        });
        jest.spyOn(ApiKeysLogic.actions, 'onApiTokenCreateSuccess');
        http.post.mockReturnValue(Promise.resolve(createdToken));

        ApiKeysLogic.actions.onApiFormSubmit();
        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/api_keys', {
          body: JSON.stringify(createdToken),
        });
        await nextTick();
        expect(ApiKeysLogic.actions.onApiTokenCreateSuccess).toHaveBeenCalledWith(createdToken);
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        mount();
        ApiKeysLogic.actions.onApiFormSubmit();
      });
    });
  });
});
