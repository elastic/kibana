/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { EngineDetails } from '../../../engine/types';

import { MetaEnginesTableLogic } from './meta_engines_table_logic';

describe('MetaEnginesTableLogic', () => {
  const DEFAULT_VALUES = {
    expandedRows: {},
    sourceEngines: {},
    expandedSourceEngines: {},
  };

  const SOURCE_ENGINES = [
    {
      name: 'source-engine-1',
    },
    {
      name: 'source-engine-2',
    },
  ] as EngineDetails[];

  const META_ENGINES = [
    {
      name: 'test-engine-1',
      includedEngines: SOURCE_ENGINES,
    },
    {
      name: 'test-engine-2',
      includedEngines: SOURCE_ENGINES,
    },
  ] as EngineDetails[];

  const DEFAULT_PROPS = {
    metaEngines: [...SOURCE_ENGINES, ...META_ENGINES] as EngineDetails[],
  };

  const { http } = mockHttpValues;
  const { mount } = new LogicMounter(MetaEnginesTableLogic);
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', async () => {
    mount({}, DEFAULT_PROPS);
    expect(MetaEnginesTableLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('expandedRows', () => {
      it('displayRow adds an expanded row entry for provided itemId', () => {
        mount(DEFAULT_VALUES, DEFAULT_PROPS);
        MetaEnginesTableLogic.actions.displayRow('source-engine-1');

        expect(MetaEnginesTableLogic.values.expandedRows).toEqual({
          'source-engine-1': true,
        });
      });

      it('hideRow removes any expanded row entry for provided itemId', () => {
        mount({ ...DEFAULT_VALUES, expandedRows: { 'source-engine-1': true } }, DEFAULT_PROPS);

        MetaEnginesTableLogic.actions.hideRow('source-engine-1');

        expect(MetaEnginesTableLogic.values.expandedRows).toEqual({});
      });
    });

    it('sourceEngines is updated by addSourceEngines', () => {
      mount({
        ...DEFAULT_VALUES,
        sourceEngines: {
          'test-engine-1': [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
          ] as EngineDetails[],
        },
      });

      MetaEnginesTableLogic.actions.addSourceEngines({
        'test-engine-2': [
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
        ] as EngineDetails[],
      });

      expect(MetaEnginesTableLogic.values.sourceEngines).toEqual({
        'test-engine-1': [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
        'test-engine-2': [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
      });
    });
  });

  describe('listeners', () => {
    describe('fetchOrDisplayRow', () => {
      it('calls displayRow when it already has data for the itemId', () => {
        mount({
          ...DEFAULT_VALUES,
          sourceEngines: {
            'test-engine-1': [
              { name: 'source-engine-1' },
              { name: 'source-engine-2' },
            ] as EngineDetails[],
          },
        });
        jest.spyOn(MetaEnginesTableLogic.actions, 'displayRow');

        MetaEnginesTableLogic.actions.fetchOrDisplayRow('test-engine-1');

        expect(MetaEnginesTableLogic.actions.displayRow).toHaveBeenCalled();
      });

      it('calls fetchSourceEngines when it needs to fetch data for the itemId', () => {
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
        mount();
        jest.spyOn(MetaEnginesTableLogic.actions, 'fetchSourceEngines');

        MetaEnginesTableLogic.actions.fetchOrDisplayRow('test-engine-1');

        expect(MetaEnginesTableLogic.actions.fetchSourceEngines).toHaveBeenCalled();
      });
    });

    describe('fetchSourceEngines', () => {
      it('calls addSourceEngines and displayRow when it has retrieved all pages', async () => {
        mount();
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
        jest.spyOn(MetaEnginesTableLogic.actions, 'displayRow');
        jest.spyOn(MetaEnginesTableLogic.actions, 'addSourceEngines');

        MetaEnginesTableLogic.actions.fetchSourceEngines('test-engine-1');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine-1/source_engines',
          {
            query: {
              'page[current]': 1,
              'page[size]': 25,
            },
          }
        );
        expect(MetaEnginesTableLogic.actions.addSourceEngines).toHaveBeenCalledWith({
          'test-engine-1': [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
        });
        expect(MetaEnginesTableLogic.actions.displayRow).toHaveBeenCalledWith('test-engine-1');
      });

      it('display a flash message on error', async () => {
        http.get.mockReturnValueOnce(Promise.reject());
        mount();

        MetaEnginesTableLogic.actions.fetchSourceEngines('test-engine-1');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });

      it('recursively fetches a number of pages', async () => {
        mount();
        jest.spyOn(MetaEnginesTableLogic.actions, 'addSourceEngines');

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

        MetaEnginesTableLogic.actions.fetchSourceEngines('test-engine-1');
        await nextTick();

        expect(MetaEnginesTableLogic.actions.addSourceEngines).toHaveBeenCalledWith({
          'test-engine-1': [
            // First page
            { name: 'source-engine-1' },
            // Second and final page
            { name: 'source-engine-2' },
          ],
        });
      });
    });
  });

  describe('selectors', () => {
    it('expandedSourceEngines includes all source engines that have been expanded ', () => {
      mount({
        ...DEFAULT_VALUES,
        sourceEngines: {
          'test-engine-1': [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
          ] as EngineDetails[],
          'test-engine-2': [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
          ] as EngineDetails[],
        },
        expandedRows: {
          'test-engine-1': true,
        },
      });

      expect(MetaEnginesTableLogic.values.expandedSourceEngines).toEqual({
        'test-engine-1': [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
      });
    });
  });
});
