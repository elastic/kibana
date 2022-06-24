/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';
import { searchIndices } from '../../__mocks__/search_indices.mock';

import { HttpError } from '../../../../../common/types/api';

import { DEFAULT_META } from '../../../shared/constants';

import { IndicesAPILogic } from '../../logic/indices_api/indices_api_logic';

import { IndicesLogic } from './indices_logic';

const DEFAULT_VALUES = {
  isLoading: true,
  indices: [],
  meta: DEFAULT_META,
};
describe('IndicesLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(IndicesAPILogic);
  const { mount } = new LogicMounter(IndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    apiLogicMount();
    mount();
  });

  it('has expected default values', () => {
    expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.onPaginate(3);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            page: {
              ...DEFAULT_META.page,
              current: 3,
            },
          },
        });
      });
    });
  });
  describe('reducers', () => {
    describe('indices', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({ indices: searchIndices, meta: DEFAULT_META });
        expect(IndicesLogic.values).toEqual({
          isLoading: false,
          indices: searchIndices,
          meta: DEFAULT_META,
        });
      });
    });

    describe('meta', () => {
      it('updates when apiSuccess listener triggered', () => {
        const newMeta = {
          page: {
            current: 2,
            size: 5,
            total_pages: 10,
            total_results: 52,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({ indices: searchIndices, meta: newMeta });
        expect(IndicesLogic.values).toEqual({
          isLoading: false,
          indices: searchIndices,
          meta: newMeta,
        });
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      IndicesLogic.actions.makeRequest({ meta: DEFAULT_META });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });
    it('calls flashAPIErrors on apiError', () => {
      IndicesLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });
  });
});
