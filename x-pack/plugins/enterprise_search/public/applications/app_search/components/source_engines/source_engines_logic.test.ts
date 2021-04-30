/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { EngineLogic } from '../engine';
import { EngineDetails } from '../engine/types';

import { SourceEnginesLogic } from './source_engines_logic';

jest.mock('../engines', () => ({
  EnginesLogic: {
    values: {
      engines: [
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
        { name: 'source-engine-3' },
        { name: 'source-engine-4' },
      ] as EngineDetails[],
    },
  },
}));

const DEFAULT_VALUES = {
  addSourceEnginesModalOpen: false,
  dataLoading: true,
  indexedEngines: [],
  selectedEngineNamesToAdd: [],
  sourceEngines: [],
};

describe('SourceEnginesLogic', () => {
  const { http } = mockHttpValues;
  const { mount } = new LogicMounter(SourceEnginesLogic);
  const { flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;

  beforeEach(() => {
    mount();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    expect(SourceEnginesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('selectors', () => {
    describe('sourceEnginesDictionary', () => {
      it('should be derived from source engines', () => {});
    });
  });

  describe('actions', () => {
    describe('closeAddSourceEnginesModal closes the modal', () => {
      mount({
        addSourceEnginesModalOpen: true,
      });

      SourceEnginesLogic.actions.closeAddSourceEnginesModal();

      expect(SourceEnginesLogic.values.addSourceEnginesModalOpen).toEqual(false);
    });

    describe('openAddSourceEnginesModal opens the modal', () => {
      mount({
        addSourceEnginesModalOpen: false,
      });

      SourceEnginesLogic.actions.openAddSourceEnginesModal();

      expect(SourceEnginesLogic.values.addSourceEnginesModalOpen).toEqual(true);
    });

    describe('setSelectedEngineNamesToAdd sets the selected engines', () => {
      SourceEnginesLogic.actions.setSelectedEngineNamesToAdd([
        'source-engine-1',
        'source-engine-2',
      ]);

      expect(SourceEnginesLogic.values.selectedEngineNamesToAdd).toEqual([
        'source-engine-1',
        'source-engine-2',
      ]);
    });

    describe('onSourceEnginesFetch', () => {
      beforeEach(() => {
        SourceEnginesLogic.actions.onSourceEnginesFetch([
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

    describe('onSourceEnginesAdd', () => {
      it('adds to existing source engines', () => {
        mount({
          sourceEngines: [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
          ] as EngineDetails[],
        });
        SourceEnginesLogic.actions.onSourceEnginesAdd([
          { name: 'source-engine-3' },
          { name: 'source-engine-4' },
        ] as EngineDetails[]);

        expect(SourceEnginesLogic.values.sourceEngines).toEqual([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
          { name: 'source-engine-3' },
          { name: 'source-engine-4' },
        ]);
      });
    });

    describe('onSourceEngineRemove', () => {
      it('removes an item from the existing source engines', () => {
        mount({
          sourceEngines: [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
            { name: 'source-engine-3' },
          ] as EngineDetails[],
        });

        SourceEnginesLogic.actions.onSourceEngineRemove('source-engine-2');

        expect(SourceEnginesLogic.values.sourceEngines).toEqual([
          { name: 'source-engine-1' },
          { name: 'source-engine-3' },
        ]);
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
        jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesFetch');

        SourceEnginesLogic.actions.fetchSourceEngines();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/source_engines',
          {
            query: {
              'page[current]': 1,
              'page[size]': 25,
            },
          }
        );
        expect(SourceEnginesLogic.actions.onSourceEnginesFetch).toHaveBeenCalledWith([
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
        jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesFetch');

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

        expect(SourceEnginesLogic.actions.onSourceEnginesFetch).toHaveBeenCalledWith([
          // First page
          { name: 'source-engine-1' },
          // Second and final page
          { name: 'source-engine-2' },
        ]);
      });
    });

    describe('addSourceEngines', () => {
      describe('happy path', () => {
        it('calls the bulkCreateLocoMocoEngineSourceEnginesPath endpoint then onSourceEnginesAdd', async () => {
          mount({
            indexedEngines: [
              {
                name: 'source-engine-3',
              },
              {
                name: 'source-engine-4',
              },
            ],
          });
          jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesAdd');
          http.post.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.addSourceEngines(['source-engine-3', 'source-engine-4']);
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/source_engines/bulk_create',
            {
              body: JSON.stringify({ source_engine_slugs: ['source-engine-3', 'source-engine-4'] }),
            }
          );
          expect(SourceEnginesLogic.actions.onSourceEnginesAdd).toHaveBeenCalledWith([
            {
              name: 'source-engine-3',
            },
            {
              name: 'source-engine-4',
            },
          ]);
        });

        it('re-initializes the engine', async () => {
          jest.spyOn(EngineLogic.actions, 'initializeEngine');
          http.post.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(EngineLogic.actions.initializeEngine).toHaveBeenCalledWith();
        });

        it('shows a success message', async () => {
          http.post.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(setSuccessMessage).toHaveBeenCalledTimes(1);
        });

        it('closes the modal', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'closeAddSourceEnginesModal');
          http.post.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(SourceEnginesLogic.actions.closeAddSourceEnginesModal).toHaveBeenCalled();
        });
      });

      describe('unhappy path', () => {
        it('display a flash message on error', async () => {
          http.post.mockReturnValueOnce(Promise.reject());
          mount();

          SourceEnginesLogic.actions.fetchSourceEngines();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        });

        it('closes the modal', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'closeAddSourceEnginesModal');
          http.post.mockReturnValueOnce(Promise.reject());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(SourceEnginesLogic.actions.closeAddSourceEnginesModal).toHaveBeenCalled();
        });
      });
    });

    describe('removeSourceEngine', () => {
      describe('happy path', () => {
        beforeAll(() => {
          // setup stuff to track actions
          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
        });

        it('calls the locoMocoEngineSourceEnginePath endpoint then onSourceEngineRemove', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'onSourceEngineRemove');
          http.delete.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(http.delete).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/source_engines/source-engine-2'
          );
          expect(SourceEnginesLogic.actions.onSourceEngineRemove).toHaveBeenCalledWith(
            'source-engine-2'
          );
        });

        it('shows a success message', async () => {
          http.delete.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(setSuccessMessage).toHaveBeenCalledTimes(1);
        });

        it('re-initializes the engine', async () => {
          jest.spyOn(EngineLogic.actions, 'initializeEngine');
          http.delete.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(EngineLogic.actions.initializeEngine).toHaveBeenCalledWith();
        });
      });

      it('display a flash message on error', async () => {
        http.delete.mockReturnValueOnce(Promise.reject());
        mount();

        SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });
  });
});
