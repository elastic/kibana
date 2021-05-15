/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';
import { mockRecursivelyFetchEngines } from '../../__mocks__';
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
  dataLoading: true,
  modalLoading: false,
  isModalOpen: false,
  indexedEngines: [],
  indexedEngineNames: [],
  sourceEngines: [],
  sourceEngineNames: [],
  selectedEngineNamesToAdd: [],
  selectableEngineNames: [],
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

  describe('actions', () => {
    describe('closeModal', () => {
      it('sets isModalOpen and modalLoading to false', () => {
        mount({
          isModalOpen: true,
          modalLoading: true,
        });

        SourceEnginesLogic.actions.closeModal();

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalOpen: false,
          modalLoading: false,
        });
      });
    });

    describe('openModal opens the modal', () => {
      mount({
        isModalOpen: false,
      });

      SourceEnginesLogic.actions.openModal();

      expect(SourceEnginesLogic.values.isModalOpen).toEqual(true);
    });

    describe('onAddEnginesSelection sets the selected engines', () => {
      SourceEnginesLogic.actions.onAddEnginesSelection(['source-engine-1', 'source-engine-2']);

      expect(SourceEnginesLogic.values.selectedEngineNamesToAdd).toEqual([
        'source-engine-1',
        'source-engine-2',
      ]);
    });

    describe('setIndexedEngines sets the indexed engines', () => {
      SourceEnginesLogic.actions.setIndexedEngines([
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
      ] as EngineDetails[]);

      expect(SourceEnginesLogic.values.indexedEngines).toEqual([
        { name: 'source-engine-1' },
        { name: 'source-engine-2' },
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
      it('calls onSourceEnginesFetch with all recursively fetched engines', () => {
        jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesFetch');

        SourceEnginesLogic.actions.fetchSourceEngines();

        expect(mockRecursivelyFetchEngines).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: '/api/app_search/engines/some-engine/source_engines',
          })
        );
        expect(SourceEnginesLogic.actions.onSourceEnginesFetch).toHaveBeenCalledWith([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
        ]);
      });
    });

    describe('fetchIndexedEngines', () => {
      it('calls setIndexedEngines with all recursively fetched engines', () => {
        jest.spyOn(SourceEnginesLogic.actions, 'setIndexedEngines');

        SourceEnginesLogic.actions.fetchIndexedEngines();

        expect(mockRecursivelyFetchEngines).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: '/api/app_search/engines',
            query: { type: 'indexed' },
          })
        );
        expect(SourceEnginesLogic.actions.setIndexedEngines).toHaveBeenCalledWith([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
        ]);
      });
    });

    describe('addSourceEngines', () => {
      it('sets modalLoading to true', () => {
        mount({ modalLoading: false });

        SourceEnginesLogic.actions.addSourceEngines([]);

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          modalLoading: true,
        });
      });

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
          jest.spyOn(SourceEnginesLogic.actions, 'closeModal');
          http.post.mockReturnValueOnce(Promise.resolve());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(SourceEnginesLogic.actions.closeModal).toHaveBeenCalled();
        });
      });

      describe('unhappy path', () => {
        it('display a flash message on error', async () => {
          http.post.mockReturnValueOnce(Promise.reject());
          mount();

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        });

        it('closes the modal', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'closeModal');
          http.post.mockReturnValueOnce(Promise.reject());

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(SourceEnginesLogic.actions.closeModal).toHaveBeenCalled();
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

  describe('selectors', () => {
    describe('indexedEngineNames', () => {
      it('returns a flat array of `indexedEngine.name`s', () => {
        mount({
          indexedEngines: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
        });

        expect(SourceEnginesLogic.values.indexedEngineNames).toEqual(['a', 'b', 'c']);
      });
    });

    describe('sourceEngineNames', () => {
      it('returns a flat array of `sourceEngine.name`s', () => {
        mount({
          sourceEngines: [{ name: 'd' }, { name: 'e' }],
        });

        expect(SourceEnginesLogic.values.sourceEngineNames).toEqual(['d', 'e']);
      });
    });

    describe('selectableEngineNames', () => {
      it('returns a flat list of indexedEngineNames that are not already in sourceEngineNames', () => {
        mount({
          indexedEngines: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
          sourceEngines: [{ name: 'a' }, { name: 'b' }],
        });

        expect(SourceEnginesLogic.values.selectableEngineNames).toEqual(['c']);
      });
    });
  });
});
