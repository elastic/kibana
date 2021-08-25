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
  DatasourceMock,
} from '../../mocks';
import { act } from 'react-dom/test-utils';
import { loadInitial } from './load_initial';
import { LensEmbeddableInput } from '../../embeddable';

const defaultSavedObjectId = '1234';
const preloadedState = {
  isLoading: true,
  visualization: {
    state: null,
    activeId: 'testVis',
  },
};

describe('Mounter', () => {
  const mockDatasource: DatasourceMock = createMockDatasource('testDatasource');
  const mockDatasource2: DatasourceMock = createMockDatasource('testDatasource2');
  const datasourceMap = {
    testDatasource2: mockDatasource2,
    testDatasource: mockDatasource,
  };
  const mockVisualization = {
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
  };
  const mockVisualization2 = {
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
  };
  const visualizationMap = {
    testVis: mockVisualization,
    testVis2: mockVisualization2,
  };

  it('should initialize initial datasource', async () => {
    const services = makeDefaultServices();
    const redirectCallback = jest.fn();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

    const lensStore = await makeLensStore({
      data: services.data,
      preloadedState,
    });
    await act(async () => {
      await loadInitial(
        lensStore,
        {
          lensServices: services,
          datasourceMap,
          visualizationMap,
        },
        redirectCallback,
        ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
      );
    });
    expect(mockDatasource.initialize).toHaveBeenCalled();
  });

  it('should have initialized only the initial datasource and visualization', async () => {
    const services = makeDefaultServices();
    const redirectCallback = jest.fn();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

    const lensStore = await makeLensStore({ data: services.data, preloadedState });
    await act(async () => {
      await loadInitial(
        lensStore,
        {
          lensServices: services,
          datasourceMap,
          visualizationMap,
        },
        redirectCallback
      );
    });
    expect(mockDatasource.initialize).toHaveBeenCalled();
    expect(mockDatasource2.initialize).not.toHaveBeenCalled();

    expect(mockVisualization.initialize).toHaveBeenCalled();
    expect(mockVisualization2.initialize).not.toHaveBeenCalled();
  });

  // it('should initialize all datasources with state from doc', async () => {})
  // it('should pass the datasource api for each layer to the visualization', async () => {})
  // it('should create a separate datasource public api for each layer', async () => {})
  // it('should not initialize visualization before datasource is initialized', async () => {})
  // it('should pass the public frame api into visualization initialize', async () => {})
  // it('should fetch suggestions of currently active datasource when initializes from visualization trigger', async () => {})
  // it.skip('should pass the datasource api for each layer to the visualization', async () => {})
  // it('displays errors from the frame in a toast', async () => {

  describe('loadInitial', () => {
    it('does not load a document if there is no initial input', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      const lensStore = makeLensStore({ data: services.data, preloadedState });
      await loadInitial(
        lensStore,
        {
          lensServices: services,
          datasourceMap,
          visualizationMap,
        },
        redirectCallback
      );
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

      const lensStore = await makeLensStore({ data: services.data, preloadedState });
      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
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
      const redirectCallback = jest.fn();
      const services = makeDefaultServices();
      const lensStore = makeLensStore({ data: services.data, preloadedState });

      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
        );
      });

      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: '5678' } as unknown) as LensEmbeddableInput
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();

      const lensStore = makeLensStore({ data: services.data, preloadedState });

      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');

      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
        );
      });
      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('adds to the recently accessed list on load', async () => {
      const redirectCallback = jest.fn();

      const services = makeDefaultServices();
      const lensStore = makeLensStore({ data: services.data, preloadedState });
      await act(async () => {
        await loadInitial(
          lensStore,
          {
            lensServices: services,
            datasourceMap,
            visualizationMap,
          },
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput
        );
      });

      expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
