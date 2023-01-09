/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockKibanaValues } from '../../../../__mocks__/kea_logic';

import { MethodApiLogic } from './method_api_logic';

describe('MethodApiLogic', () => {
  const { mount } = new LogicMounter(MethodApiLogic);
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
  });
});
