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

import { MethodCrawlerLogic } from './method_crawler_logic';

// Failing https://github.com/elastic/kibana/issues/135440
describe.skip('MethodCrawlerLogic', () => {
  const { mount } = new LogicMounter(MethodCrawlerLogic);
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  describe('listeners', () => {
    describe('apiSuccess', () => {
      it('navigates user to index detail view', () => {
        MethodCrawlerLogic.actions.apiSuccess({ created: 'my-index' });

        expect(navigateToUrl).toHaveBeenCalledWith('/search_indices/my-index');
      });
    });

    describe('makeRequest', () => {
      it('clears any displayed errors', () => {
        MethodCrawlerLogic.actions.makeRequest({ indexName: 'my-index', language: 'Universal' });

        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('apiError', () => {
      it('displays the error to the user', () => {
        const error = {} as HttpError;

        MethodCrawlerLogic.actions.apiError(error);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });
  });
});
