/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'test-engine' } },
}));

import { nextTick } from '@kbn/test/jest';

import { EngineDetails } from '../engine/types';

import { SourceEnginesLogic } from './source_engines_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  sourceEngines: [],
};

describe('SourceEnginesLogic', () => {
  const { http } = mockHttpValues;
  const { mount } = new LogicMounter(SourceEnginesLogic);
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('initializes with default values', () => {
    expect(SourceEnginesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('setSourceEngines', () => {
    beforeEach(() => {
      SourceEnginesLogic.actions.setSourceEngines([
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
      ] as EngineDetails[]);
    });

    it('sets the source engines', () => {
      expect(SourceEnginesLogic.values.sourceEngines).toEqual([
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
      ]);
    });

    it('sets dataLoading to false', () => {
      expect(SourceEnginesLogic.values.dataLoading).toEqual(false);
    });
  });

  describe('fetchSourceEngines', () => {
    it('calls addSourceEngines and displayRow when it has retrieved all pages', async () => {
      http.get.mockReturnValueOnce(
        Promise.resolve({
          meta: {
            page: {
              total_pages: 1,
            },
          },
          results: [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
        })
      );
      jest.spyOn(SourceEnginesLogic.actions, 'setSourceEngines');

      SourceEnginesLogic.actions.fetchSourceEngines();
      await nextTick();

      expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/test-engine/source_engines', {
        query: {
          'page[current]': 1,
          'page[size]': 25,
        },
      });
      expect(SourceEnginesLogic.actions.setSourceEngines).toHaveBeenCalledWith([
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
      ]);
    });

    it('display a flash message on error', async () => {
      http.get.mockReturnValueOnce(Promise.reject());
      mount();

      SourceEnginesLogic.actions.fetchSourceEngines();
      await nextTick();

      expect(flashAPIErrors).toHaveBeenCalledTimes(1);
    });

    it('recursively fetches a number of pages', async () => {
      mount();
      jest.spyOn(SourceEnginesLogic.actions, 'setSourceEngines');

      // First page
      http.get.mockReturnValueOnce(
        Promise.resolve({
          meta: {
            page: {
              total_pages: 2,
            },
          },
          results: [{ name: 'source-engine-1' }],
        })
      );

      // Second and final page
      http.get.mockReturnValueOnce(
        Promise.resolve({
          meta: {
            page: {
              total_pages: 2,
            },
          },
          results: [{ name: 'source-engine-2' }],
        })
      );

      SourceEnginesLogic.actions.fetchSourceEngines();
      await nextTick();
      await nextTick(); // I think I need this for multiple http.get calls

      expect(SourceEnginesLogic.actions.setSourceEngines).toHaveBeenCalledWith([
        // First page
        { name: 'source-engine-1' },
        // Second and final page
        { name: 'source-engine-2' },
      ]);
    });
  });
});
