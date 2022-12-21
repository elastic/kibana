/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockKibanaValues,
} from '../../../../__mocks__/kea_logic';

import { HttpError } from '../../../../../../common/types/api';

import { MethodApiLogic } from './method_api_logic';

describe('MethodApiLogic', () => {
  const { mount } = new LogicMounter(MethodApiLogic);
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  describe('listeners', () => {
    describe('apiSuccess', () => {
      it('navigates user to index detail view', () => {
        MethodApiLogic.actions.apiSuccess({ indexName: 'my-index' });

        expect(navigateToUrl).toHaveBeenCalledWith('/search_indices/my-index/overview');
      });
    });

    describe('makeRequest', () => {
      it('clears any displayed errors', () => {
        MethodApiLogic.actions.makeRequest({ indexName: 'my-index', language: 'Universal' });

        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('apiError', () => {
      it('displays the error to the user', () => {
        const error = {} as HttpError;

        MethodApiLogic.actions.apiError(error);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });
  });
});
