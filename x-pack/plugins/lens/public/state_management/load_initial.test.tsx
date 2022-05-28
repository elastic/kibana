/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  makeDefaultServices,
  makeLensStore,
  defaultDoc,
  createMockVisualization,
  createMockDatasource,
  mockStoreDeps,
  exactMatchDoc,
} from '../mocks';
import { Location, History } from 'history';
import { act } from 'react-dom/test-utils';
import { LensEmbeddableInput } from '../embeddable';
import { loadInitial } from './lens_slice';
import { Filter } from '@kbn/es-query';

const history = {
  location: {
    search: '?search',
  } as Location,
} as History;

const defaultSavedObjectId = '1234';
const preloadedState = {
  isLoading: true,
  visualization: {
    state: null,
    activeId: 'testVis',
  },
};

const defaultProps = {
  redirectCallback: jest.fn(),
  initialInput: { savedObjectId: defaultSavedObjectId } as unknown as LensEmbeddableInput,
  history,
};

describe('Initializing the store', () => {
  it('should initialize initial datasource', async () => {
    const { store, deps } = await makeLensStore({ preloadedState });
    await act(async () => {
      await store.dispatch(loadInitial(defaultProps));
    });
    expect(deps.datasourceMap.testDatasource.initialize).toHaveBeenCalled();
  });

  it('should have initialized the initial datasource and visualization', async () => {
    const { store, deps } = await makeLensStore({ preloadedState });
    await act(async () => {
      await store.dispatch(loadInitial({ ...defaultProps, initialInput: undefined }));
    });
    expect(deps.datasourceMap.testDatasource.initialize).toHaveBeenCalled();
    expect(deps.datasourceMap.testDatasource2.initialize).not.toHaveBeenCalled();
    expect(deps.visualizationMap.testVis.initialize).toHaveBeenCalled();
    expect(deps.visualizationMap.testVis2.initialize).not.toHaveBeenCalled();
  });

  it('should initialize all datasources with state from doc', async () => {
    const datasource1State = { datasource1: '' };
    const datasource2State = { datasource2: '' };
    const services = makeDefaultServices();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
      attributes: {
        exactMatchDoc,
        visualizationType: 'testVis',
        title: '',
        state: {
          datasourceStates: {
            testDatasource: datasource1State,
            testDatasource2: datasource2State,
          },
          visualization: {},
          query: { query: '', language: 'lucene' },
          filters: [],
        },
        references: [],
      },
    });

    const storeDeps = mockStoreDeps({
      lensServices: services,
      visualizationMap: {
        testVis: {
          ...createMockVisualization(),
          id: 'testVis',
          visualizationTypes: [
            {
              icon: 'empty',
              id: 'testVis',
              label: 'TEST1',
              groupLabel: 'testVisGroup',
            },
          ],
        },
      },
      datasourceMap: {
        testDatasource: createMockDatasource('testDatasource'),
        testDatasource2: createMockDatasource('testDatasource2'),
        testDatasource3: createMockDatasource('testDatasource3'),
      },
    });

    const { store, deps } = await makeLensStore({
      storeDeps,
      preloadedState,
    });

    await act(async () => {
      await store.dispatch(loadInitial(defaultProps));
    });
    const { datasourceMap } = deps;
    expect(datasourceMap.testDatasource.initialize).toHaveBeenCalled();

    expect(datasourceMap.testDatasource.initialize).toHaveBeenCalledWith(
      datasource1State,
      [],
      undefined,
      {
        isFullEditor: true,
      }
    );
    expect(datasourceMap.testDatasource2.initialize).toHaveBeenCalledWith(
      datasource2State,
      [],
      undefined,
      {
        isFullEditor: true,
      }
    );
    expect(datasourceMap.testDatasource3.initialize).not.toHaveBeenCalled();
    expect(store.getState()).toMatchSnapshot();
  });

  describe('loadInitial', () => {
    it('does not load a document if there is no initial input', async () => {
      const { deps, store } = makeLensStore({ preloadedState });
      await act(async () => {
        await store.dispatch(
          loadInitial({
            ...defaultProps,
            initialInput: undefined,
          })
        );
      });
      expect(deps.lensServices.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('starts new searchSessionId', async () => {
      const { store } = await makeLensStore({ preloadedState });
      await act(async () => {
        await store.dispatch(loadInitial({ ...defaultProps, initialInput: undefined }));
      });
      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: 'sessionId-1',
        }),
      });
    });

    it('cleans datasource and visualization state properly when reloading', async () => {
      const { store, deps } = await makeLensStore({
        preloadedState: {
          ...preloadedState,
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          datasourceStates: { testDatasource: { isLoading: false, state: {} } },
        },
      });

      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          activeDatasourceId: 'testDatasource',
          datasourceStates: {
            testDatasource: { isLoading: false, state: {} },
          },
        }),
      });

      await act(async () => {
        await store.dispatch(
          loadInitial({
            ...defaultProps,
            initialInput: undefined,
          })
        );
      });

      expect(deps.visualizationMap.testVis.initialize).toHaveBeenCalled();
      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          visualization: {
            state: { newState: 'newState' }, // new vis gets initialized
            activeId: 'testVis',
          },
          activeDatasourceId: 'testDatasource2', // resets to first on the list
          datasourceStates: {
            testDatasource: { isLoading: false, state: undefined }, // state resets to undefined
            testDatasource2: {
              state: {}, // initializes first in the map
            },
          },
        }),
      });
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      const mockFilters = 'some filters from the filter manager' as unknown as Filter[];

      jest
        .spyOn(deps.lensServices.data.query.filterManager, 'getFilters')
        .mockReturnValue(mockFilters);

      await act(async () => {
        store.dispatch(loadInitial(defaultProps));
      });

      expect(deps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(deps.lensServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } }, meta: { index: 'injected!' } },
      ]);

      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          persistedDoc: { ...defaultDoc, type: 'lens' },
          query: 'kuery',
          isLoading: false,
          activeDatasourceId: 'testDatasource',
          filters: mockFilters,
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      await act(async () => {
        await store.dispatch(loadInitial(defaultProps));
      });

      await act(async () => {
        await store.dispatch(loadInitial(defaultProps));
      });

      expect(deps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await store.dispatch(
          loadInitial({
            ...defaultProps,
            initialInput: { savedObjectId: '5678' } as unknown as LensEmbeddableInput,
          })
        );
      });

      expect(deps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      deps.lensServices.attributeService.unwrapAttributes = jest
        .fn()
        .mockRejectedValue('failed to load');
      const redirectCallback = jest.fn();
      await act(async () => {
        await store.dispatch(loadInitial({ ...defaultProps, redirectCallback }));
      });

      expect(deps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(deps.lensServices.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('redirects if saved object is an aliasMatch', async () => {
      const { store, deps } = makeLensStore({ preloadedState });
      deps.lensServices.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        attributes: {
          ...defaultDoc,
        },
        metaInfo: {
          sharingSavedObjectProps: {
            outcome: 'aliasMatch',
            aliasTargetId: 'id2',
            aliasPurpose: 'savedObjectConversion',
          },
        },
      });

      await act(async () => {
        await store.dispatch(loadInitial(defaultProps));
      });

      expect(deps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(deps.lensServices.spaces.ui.redirectLegacyUrl).toHaveBeenCalledWith({
        path: '#/edit/id2?search',
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'Lens visualization',
      });
    });

    it('adds to the recently accessed list on load', async () => {
      const { store, deps } = makeLensStore({ preloadedState });
      await act(async () => {
        await store.dispatch(loadInitial(defaultProps));
      });

      expect(deps.lensServices.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
