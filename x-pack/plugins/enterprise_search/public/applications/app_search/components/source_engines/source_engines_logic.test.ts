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
import { mockRecursivelyFetchEngines } from '../../__mocks__';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { EngineLogic } from '../engine';
import { EngineDetails } from '../engine/types';

import { SourceEnginesLogic } from './source_engines_logic';

describe('SourceEnginesLogic', () => {
  const { http } = mockHttpValues;
  const { mount } = new LogicMounter(SourceEnginesLogic);
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    mount();
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

    describe('openModal', () => {
      it('sets isModalOpen to true', () => {
        mount({
          isModalOpen: false,
        });

        SourceEnginesLogic.actions.openModal();

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalOpen: true,
        });
      });
    });

    describe('onAddEnginesSelection', () => {
      it('sets selectedEngineNamesToAdd to the specified value', () => {
        mount();

        SourceEnginesLogic.actions.onAddEnginesSelection(['source-engine-1', 'source-engine-2']);

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          selectedEngineNamesToAdd: ['source-engine-1', 'source-engine-2'],
        });
      });
    });

    describe('setIndexedEngines', () => {
      it('sets indexedEngines to the specified value', () => {
        mount();

        SourceEnginesLogic.actions.setIndexedEngines([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
        ] as EngineDetails[]);

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          indexedEngines: [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
          // Selectors
          indexedEngineNames: ['source-engine-1', 'source-engine-2'],
          selectableEngineNames: ['source-engine-1', 'source-engine-2'],
        });
      });

      it('sets indexedEngines filters out elasticsearch type engines', () => {
        mount();

        SourceEnginesLogic.actions.setIndexedEngines([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
          { name: 'source-engine-elasticsearch', type: 'elasticsearch' },
        ] as EngineDetails[]);

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          indexedEngines: [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
          // Selectors
          indexedEngineNames: ['source-engine-1', 'source-engine-2'],
          selectableEngineNames: ['source-engine-1', 'source-engine-2'],
        });
      });
    });

    describe('onSourceEnginesFetch', () => {
      it('sets sourceEngines to the specified value and dataLoading to false', () => {
        mount();

        SourceEnginesLogic.actions.onSourceEnginesFetch([
          { name: 'source-engine-1' },
          { name: 'source-engine-2' },
        ] as EngineDetails[]);

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          sourceEngines: [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
          // Selectors
          sourceEngineNames: ['source-engine-1', 'source-engine-2'],
        });
      });
    });

    describe('onSourceEnginesAdd', () => {
      it('adds to the existing sourceEngines', () => {
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

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          sourceEngines: [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
            { name: 'source-engine-3' },
            { name: 'source-engine-4' },
          ],
          // Selectors
          sourceEngineNames: [
            'source-engine-1',
            'source-engine-2',
            'source-engine-3',
            'source-engine-4',
          ],
        });
      });
    });

    describe('onSourceEngineRemove', () => {
      it('removes an item from the existing sourceEngines', () => {
        mount({
          sourceEngines: [
            { name: 'source-engine-1' },
            { name: 'source-engine-2' },
            { name: 'source-engine-3' },
          ] as EngineDetails[],
        });

        SourceEnginesLogic.actions.onSourceEngineRemove('source-engine-2');

        expect(SourceEnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          sourceEngines: [{ name: 'source-engine-1' }, { name: 'source-engine-3' }],
          // Selectors
          sourceEngineNames: ['source-engine-1', 'source-engine-3'],
        });
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

  describe('listeners', () => {
    describe('fetchSourceEngines', () => {
      it('calls onSourceEnginesFetch with all recursively fetched engines', () => {
        jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesFetch');

        SourceEnginesLogic.actions.fetchSourceEngines();

        expect(mockRecursivelyFetchEngines).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: '/internal/app_search/engines/some-engine/source_engines',
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
            endpoint: '/internal/app_search/engines',
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

      describe('on success', () => {
        beforeEach(() => {
          http.post.mockReturnValue(Promise.resolve());
          mount({
            indexedEngines: [{ name: 'source-engine-3' }, { name: 'source-engine-4' }],
          });
        });

        it('calls the bulk endpoint, adds source engines to state, and shows a success message', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'onSourceEnginesAdd');

          SourceEnginesLogic.actions.addSourceEngines(['source-engine-3', 'source-engine-4']);
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/internal/app_search/engines/some-engine/source_engines/bulk_create',
            {
              body: JSON.stringify({ source_engine_slugs: ['source-engine-3', 'source-engine-4'] }),
            }
          );
          expect(SourceEnginesLogic.actions.onSourceEnginesAdd).toHaveBeenCalledWith([
            { name: 'source-engine-3' },
            { name: 'source-engine-4' },
          ]);
          expect(flashSuccessToast).toHaveBeenCalledWith(
            '2 engines were added to this meta engine'
          );
        });

        it('re-initializes the engine and closes the modal', async () => {
          jest.spyOn(EngineLogic.actions, 'initializeEngine');
          jest.spyOn(SourceEnginesLogic.actions, 'closeModal');

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(EngineLogic.actions.initializeEngine).toHaveBeenCalled();
          expect(SourceEnginesLogic.actions.closeModal).toHaveBeenCalled();
        });
      });

      describe('on error', () => {
        beforeEach(() => {
          http.post.mockReturnValue(Promise.reject());
          mount();
        });

        it('flashes errors and closes the modal', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'closeModal');

          SourceEnginesLogic.actions.addSourceEngines([]);
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledTimes(1);
          expect(SourceEnginesLogic.actions.closeModal).toHaveBeenCalled();
        });
      });
    });

    describe('removeSourceEngine', () => {
      describe('on success', () => {
        beforeEach(() => {
          http.delete.mockReturnValue(Promise.resolve());
          mount();
        });

        it('calls the delete endpoint and removes source engines from state', async () => {
          jest.spyOn(SourceEnginesLogic.actions, 'onSourceEngineRemove');

          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(http.delete).toHaveBeenCalledWith(
            '/internal/app_search/engines/some-engine/source_engines/source-engine-2'
          );
          expect(SourceEnginesLogic.actions.onSourceEngineRemove).toHaveBeenCalledWith(
            'source-engine-2'
          );
        });

        it('shows a success message', async () => {
          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(flashSuccessToast).toHaveBeenCalledWith(
            "Engine 'source-engine-2' was removed from this meta engine"
          );
        });

        it('re-initializes the engine', async () => {
          jest.spyOn(EngineLogic.actions, 'initializeEngine');

          SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
          await nextTick();

          expect(EngineLogic.actions.initializeEngine).toHaveBeenCalledWith();
        });
      });

      it('displays a flash message on error', async () => {
        http.delete.mockReturnValueOnce(Promise.reject());
        mount();

        SourceEnginesLogic.actions.removeSourceEngine('source-engine-2');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });
  });
});
