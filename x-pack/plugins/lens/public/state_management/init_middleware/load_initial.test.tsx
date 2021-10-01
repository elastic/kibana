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
} from '../../mocks';
import { Location, History } from 'history';
import { act } from 'react-dom/test-utils';
import { loadInitial } from './load_initial';
import { LensEmbeddableInput } from '../../embeddable';
import { getPreloadedState } from '../lens_slice';
import { LensAppState } from '..';
import { LensAppServices } from '../../app_plugin/types';
import { DatasourceMap, VisualizationMap } from '../../types';

const defaultSavedObjectId = '1234';
const preloadedState = {
  isLoading: true,
  visualization: {
    state: null,
    activeId: 'testVis',
  },
};

const exactMatchDoc = {
  ...defaultDoc,
  sharingSavedObjectProps: {
    outcome: 'exactMatch',
  },
};

const getDefaultLensServices = () => {
  const lensServices = makeDefaultServices();
  lensServices.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(exactMatchDoc);
  return lensServices;
};

const getStoreDeps = (deps?: {
  lensServices?: LensAppServices;
  datasourceMap?: DatasourceMap;
  visualizationMap?: VisualizationMap;
}) => {
  const lensServices = deps?.lensServices || getDefaultLensServices();
  const datasourceMap = deps?.datasourceMap || {
    testDatasource2: createMockDatasource('testDatasource2'),
    testDatasource: createMockDatasource('testDatasource'),
  };
  const visualizationMap = deps?.visualizationMap || {
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
    testVis2: {
      ...createMockVisualization(),
      id: 'testVis2',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis2',
          label: 'TEST2',
          groupLabel: 'testVis2Group',
        },
      ],
    },
  };
  return {
    datasourceMap,
    visualizationMap,
    lensServices,
  };
};

describe('init_middleware', () => {
  it('should initialize initial datasource', async () => {
    const storeDeps = getStoreDeps();
    const { lensServices, datasourceMap } = storeDeps;

    const lensStore = await makeLensStore({
      data: lensServices.data,
      preloadedState,
    });
    await act(async () => {
      await loadInitial(lensStore, storeDeps, {
        redirectCallback: jest.fn(),
        initialInput: { savedObjectId: defaultSavedObjectId } as unknown as LensEmbeddableInput,
      });
    });
    expect(datasourceMap.testDatasource.initialize).toHaveBeenCalled();
  });

  it('should have initialized the initial datasource and visualization', async () => {
    const storeDeps = getStoreDeps();
    const { lensServices, datasourceMap, visualizationMap } = storeDeps;

    const lensStore = await makeLensStore({ data: lensServices.data, preloadedState });
    await act(async () => {
      await loadInitial(lensStore, storeDeps, { redirectCallback: jest.fn() });
    });
    expect(datasourceMap.testDatasource.initialize).toHaveBeenCalled();
    expect(datasourceMap.testDatasource2.initialize).not.toHaveBeenCalled();
    expect(visualizationMap.testVis.initialize).toHaveBeenCalled();
    expect(visualizationMap.testVis2.initialize).not.toHaveBeenCalled();
  });

  it('should initialize all datasources with state from doc', async () => {
    const datasource1State = { datasource1: '' };
    const datasource2State = { datasource2: '' };
    const services = makeDefaultServices();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
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
    });

    const storeDeps = getStoreDeps({
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
    const { datasourceMap } = storeDeps;

    const lensStore = await makeLensStore({
      data: services.data,
      preloadedState,
    });

    await act(async () => {
      await loadInitial(lensStore, storeDeps, {
        redirectCallback: jest.fn(),
        initialInput: { savedObjectId: defaultSavedObjectId } as unknown as LensEmbeddableInput,
      });
    });
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
    expect(lensStore.getState()).toMatchSnapshot();
  });

  describe('loadInitial', () => {
    it('does not load a document if there is no initial input', async () => {
      const storeDeps = getStoreDeps();
      const { lensServices } = storeDeps;

      const lensStore = makeLensStore({ data: lensServices.data, preloadedState });
      await loadInitial(lensStore, storeDeps, { redirectCallback: jest.fn() });
      expect(lensServices.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('cleans datasource and visualization state properly when reloading', async () => {
      const storeDeps = getStoreDeps();
      const lensStore = await makeLensStore({
        data: storeDeps.lensServices.data,
        preloadedState: {
          ...preloadedState,
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          datasourceStates: { testDatasource: { isLoading: false, state: {} } },
        },
      });

      expect(lensStore.getState()).toEqual({
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

      const emptyState = getPreloadedState(storeDeps) as LensAppState;
      storeDeps.lensServices.attributeService.unwrapAttributes = jest.fn();
      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: undefined,
          emptyState,
        });
      });

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          visualization: {
            activeId: 'testVis',
            state: null, // resets to null
          },
          activeDatasourceId: 'testDatasource2', // resets to first on the list
          datasourceStates: {
            testDatasource: { isLoading: false, state: undefined }, // state resets to undefined
          },
        }),
      });
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const storeDeps = getStoreDeps();
      const { lensServices } = storeDeps;
      const emptyState = getPreloadedState(storeDeps) as LensAppState;

      const lensStore = await makeLensStore({ data: lensServices.data, preloadedState });
      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
          emptyState,
        });
      });

      expect(lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(lensServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } } },
      ]);

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          persistedDoc: { ...defaultDoc, type: 'lens' },
          query: 'kuery',
          isLoading: false,
          activeDatasourceId: 'testDatasource',
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const storeDeps = getStoreDeps();
      const { lensServices } = storeDeps;

      const lensStore = makeLensStore({ data: lensServices.data, preloadedState });
      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
        });
      });

      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
        });
      });

      expect(lensServices.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: { savedObjectId: '5678' } as unknown as LensEmbeddableInput,
        });
      });

      expect(lensServices.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const services = makeDefaultServices();
      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');

      const storeDeps = getStoreDeps({ lensServices: services });
      const { lensServices } = storeDeps;

      const redirectCallback = jest.fn();

      const lensStore = makeLensStore({ data: lensServices.data, preloadedState });

      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback,
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
        });
      });
      expect(lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(lensServices.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('redirects if saved object is an aliasMatch', async () => {
      const services = makeDefaultServices();
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        ...defaultDoc,
        sharingSavedObjectProps: {
          outcome: 'aliasMatch',
          aliasTargetId: 'id2',
        },
      });

      const storeDeps = getStoreDeps({ lensServices: services });
      const lensStore = makeLensStore({ data: storeDeps.lensServices.data, preloadedState });

      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
          history: {
            location: {
              search: '?search',
            } as Location,
          } as History,
        });
      });
      expect(storeDeps.lensServices.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(storeDeps.lensServices.spaces.ui.redirectLegacyUrl).toHaveBeenCalledWith(
        '#/edit/id2?search',
        'Lens visualization'
      );
    });

    it('adds to the recently accessed list on load', async () => {
      const storeDeps = getStoreDeps();
      const { lensServices } = storeDeps;

      const lensStore = makeLensStore({ data: lensServices.data, preloadedState });
      await act(async () => {
        await loadInitial(lensStore, storeDeps, {
          redirectCallback: jest.fn(),
          initialInput: {
            savedObjectId: defaultSavedObjectId,
          } as unknown as LensEmbeddableInput,
        });
      });

      expect(lensServices.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
