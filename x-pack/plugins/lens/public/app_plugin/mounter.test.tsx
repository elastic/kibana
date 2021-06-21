/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  makeDefaultServices,
  mockLensStore,
  defaultDoc,
  createMockVisualization,
  mockDataPlugin,
  createExpressionRendererMock,
} from '../mocks';
import { createMockDatasource, DatasourceMock } from '../mocks';
import { act } from 'react-dom/test-utils';
import { loadInitialStore } from './mounter';
import { LensEmbeddableInput } from '../editor_frame_service/embeddable/embeddable';
import { coreMock } from 'src/core/public/mocks';
import { expressionsPluginMock } from 'src/plugins/expressions/public/mocks';
import { uiActionsPluginMock } from 'src/plugins/ui_actions/public/mocks';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';

const defaultSavedObjectId = '1234';

describe('Mounter', () => {
  const byValueFlag = { allowByValueEmbeddables: true };
  const mockDatasource: DatasourceMock = createMockDatasource('testDatasource');
  const mockDatasource2: DatasourceMock = createMockDatasource('testDatasource2');
  const datasourceMap = {
    testDatasource2: mockDatasource2,
    testDatasource: mockDatasource,
  };
  let mockVisualization = {
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
  const visualizationMap = {
    testVis: mockVisualization,
  };

  it('should pass the datasource api for each layer to the visualization', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockDatasource2.getLayers.mockReturnValue(['second', 'third']);
    mockVisualization.getLayerIds.mockReturnValue(['first', 'second', 'third']);
    const props = {
      ...getDefaultProps(),
      visualizationMap: {
        testVis: mockVisualization,
      },
      datasourceMap: {
        testDatasource: mockDatasource,
        testDatasource2: mockDatasource2,
      },

      ExpressionRenderer: expressionRendererMock,
    };

    await mountWithProvider(<EditorFrame {...props} />, {
      data: props.plugins.data,
      preloadedState: {
        persistedDoc: {
          visualizationType: 'testVis',
          title: '',
          state: {
            datasourceStates: {
              testDatasource: {},
              testDatasource2: {},
            },
            visualization: {},
            query: { query: '', language: 'lucene' },
            filters: [],
          },
          references: [],
        },
        datasourceStates: {
          testDatasource: {
            isLoading: false,
            state: '',
          },
        },
      },
    });

    expect(mockVisualization.getConfiguration).toHaveBeenCalled();

    const datasourceLayers =
      mockVisualization.getConfiguration.mock.calls[0][0].frame.datasourceLayers;
    expect(datasourceLayers.first).toBe(mockDatasource.publicAPIMock);
    expect(datasourceLayers.second).toBe(mockDatasource2.publicAPIMock);
    expect(datasourceLayers.third).toBe(mockDatasource2.publicAPIMock);
  });


  it('loads a document and uses query and filters if initial input is provided', async () => {
    const services = makeDefaultServices();
    const redirectCallback = jest.fn();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

    const lensStore = await mockLensStore({ data: services.data });
    await act(async () => {
      await loadInitialStore(
        redirectCallback,
        { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
        services,
        lensStore,
        undefined,
        byValueFlag,
        datasourceMap,
        visualizationMap
      );
    });

    expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
      savedObjectId: defaultSavedObjectId,
    });

    expect(services.data.indexPatterns.get).toHaveBeenCalledWith('1');

    expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
      { query: { match_phrase: { src: 'test' } } },
    ]);

    expect(lensStore.getState()).toEqual({
      app: expect.objectContaining({
        persistedDoc: { ...defaultDoc, type: 'lens' },
        query: 'kuery',
        isAppLoading: false,
        activeDatasourceId: 'testDatasource',
      }),
    });
  });

  it('should create a separate datasource public api for each layer', async () => {
    mockDatasource.initialize.mockImplementation((initialState) => Promise.resolve(initialState));
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockDatasource2.initialize.mockImplementation((initialState) =>
      Promise.resolve(initialState)
    );
    mockDatasource2.getLayers.mockReturnValue(['second', 'third']);
    const services = makeDefaultServices();
    const redirectCallback = jest.fn();
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

    const lensStore = await mockLensStore({ data: services.data });

    const datasource1State = { datasource1: '' };
    const datasource2State = { datasource2: '' };

    const props = {
      ...getDefaultProps(),
      visualizationMap: {
        testVis: mockVisualization,
      },
      datasourceMap: {
        testDatasource: mockDatasource,
        testDatasource2: mockDatasource2,
      },

      ExpressionRenderer: expressionRendererMock,
    };
    // await mountWithProvider(<EditorFrame {...props} />, {
    //   preloadedState: {
    //     persistedDoc: {
    //       visualizationType: 'testVis',
    //       title: '',
    //       state: {
    //         datasourceStates: {
    //           testDatasource: datasource1State,
    //           testDatasource2: datasource2State,
    //         },
    //         visualization: {},
    //         query: { query: '', language: 'lucene' },
    //         filters: [],
    //       },
    //       references: [],
    //     },
    //     datasourceStates: {
    //       testDatasource: {
    //         isLoading: false,
    //         state: '',
    //       },
    //     },
    //   },
    //   data: props.plugins.data,
    // });
    
    it('should have initialized only the initial datasource and visualization', () => {
      expect(mockDatasource.initialize).toHaveBeenCalled();
      expect(mockDatasource2.initialize).not.toHaveBeenCalled();

      expect(mockVisualization.initialize).toHaveBeenCalled();
      expect(mockVisualization2.initialize).not.toHaveBeenCalled();
    });

    it('should render data panel after initialization is complete', async () => {
      const initialState = {};
      let databaseInitialized: ({}) => void;

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            initialize: () =>
              new Promise((resolve) => {
                databaseInitialized = resolve;
              }),
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };

      await mountWithProvider(<EditorFrame {...props} />, { data: props.plugins.data });

      await act(async () => {
        databaseInitialized!(initialState);
      });
      expect(mockDatasource.renderDataPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });

    await act(async () => {
      await loadInitialStore(
        redirectCallback,
        { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
        services,
        lensStore,
        undefined,
        byValueFlag,
        datasourceMap,
        visualizationMap
      );
    });

    expect(mockDatasource.getPublicAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        state: datasource1State,
        layerId: 'first',
      })
    );
    expect(mockDatasource2.getPublicAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        state: datasource2State,
        layerId: 'second',
      })
    );
    expect(mockDatasource2.getPublicAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        state: datasource2State,
        layerId: 'third',
      })
    );
  });

  // it('should initialize initial datasource', async () => {
  //   mockVisualization.getLayerIds.mockReturnValue([]);
  //   const props = {
  //     ...getDefaultProps(),
  //     visualizationMap: {
  //       testVis: mockVisualization,
  //     },
  //     datasourceMap: {
  //       testDatasource: mockDatasource,
  //     },

  //     ExpressionRenderer: expressionRendererMock,
  //   };

  //   await mountWithProvider(<EditorFrame {...props} />, {
  //     data: props.plugins.data,
  //     preloadedState: {
  //       datasourceStates: { testDatasource: { isLoading: true, state: {} } },
  //     },
  //   });
  //   expect(mockDatasource.initialize).toHaveBeenCalled();
  // });

  // it('should initialize all datasources with state from doc', async () => {
  //   const mockDatasource3 = createMockDatasource('testDatasource3');
  //   const datasource1State = { datasource1: '' };
  //   const datasource2State = { datasource2: '' };
  //   const props = {
  //     ...getDefaultProps(),
  //     visualizationMap: {
  //       testVis: mockVisualization,
  //     },
  //     datasourceMap: {
  //       testDatasource: mockDatasource,
  //       testDatasource2: mockDatasource2,
  //       testDatasource3: mockDatasource3,
  //     },

  //     ExpressionRenderer: expressionRendererMock,
  //   };

  //   await mountWithProvider(<EditorFrame {...props} />, {
  //     data: props.plugins.data,
  //     preloadedState: {
  //       persistedDoc: {
  //         visualizationType: 'testVis',
  //         title: '',
  //         state: {
  //           datasourceStates: {
  //             testDatasource: datasource1State,
  //             testDatasource2: datasource2State,
  //           },
  //           visualization: {},
  //           query: { query: '', language: 'lucene' },
  //           filters: [],
  //         },
  //         references: [],
  //       },
  //       datasourceStates: {
  //         testDatasource: { isLoading: false, state: datasource1State },
  //         testDatasource2: { isLoading: false, state: datasource2State },
  //       },
  //     },
  //   });

  //   expect(mockDatasource.initialize).toHaveBeenCalledWith(datasource1State, [], undefined, {
  //     isFullEditor: true,
  //   });
  //   expect(mockDatasource2.initialize).toHaveBeenCalledWith(datasource2State, [], undefined, {
  //     isFullEditor: true,
  //   });
  //   expect(mockDatasource3.initialize).not.toHaveBeenCalled();
  // });

  // it('should not initialize visualization before datasource is initialized', async () => {
  //   const props = {
  //     ...getDefaultProps(),
  //     visualizationMap: {
  //       testVis: mockVisualization,
  //     },
  //     datasourceMap: {
  //       testDatasource: mockDatasource,
  //     },

  //     ExpressionRenderer: expressionRendererMock,
  //   };

  //   await act(async () => {
  //     mountWithProvider(<EditorFrame {...props} />, {
  //       data: props.plugins.data,
  //       preloadedState: {
  //         activeDatasourceId: 'testDatasource',
  //         visualization: { activeId: mockVisualization.id, state: null },
  //         datasourceStates: {
  //           testDatasource: {
  //             isLoading: true,
  //             state: {
  //               internalState1: '',
  //             },
  //           },
  //         },
  //       },
  //     });
  //     expect(mockVisualization.initialize).not.toHaveBeenCalled();
  //   });

  //   expect(mockVisualization.initialize).toHaveBeenCalled();
  // });

  // it('should pass the public frame api into visualization initialize', async () => {
  //   const props = {
  //     ...getDefaultProps(),
  //     visualizationMap: {
  //       testVis: mockVisualization,
  //     },
  //     datasourceMap: {
  //       testDatasource: mockDatasource,
  //     },

  //     ExpressionRenderer: expressionRendererMock,
  //   };
  //   // todo: move to mounter
  //   await act(async () => {
  //     mountWithProvider(<EditorFrame {...props} />, {
  //       data: props.plugins.data,
  //       preloadedState: {
  //         visualization: { activeId: mockVisualization.id, state: null },
  //       },
  //     });
  //     expect(mockVisualization.initialize).not.toHaveBeenCalled();
  //   });

  //   expect(mockVisualization.initialize).toHaveBeenCalledWith('l10');
  // });
  // it('should fetch suggestions of currently active datasource when initializes from visualization trigger', async () => {
  //   const props = {
  //     ...getDefaultProps(),
  //     visualizationMap: {
  //       testVis: mockVisualization,
  //     },
  //     datasourceMap: {
  //       testDatasource: mockDatasource,
  //       testDatasource2: mockDatasource2,
  //     },

  //     ExpressionRenderer: expressionRendererMock,
  //   };
  //   await mountWithProvider(<EditorFrame {...props} />, { data: props.plugins.data });

  //   expect(mockDatasource.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalled();
  // });

  function getDefaultProps() {
    const defaultProps = {
      store: {
        save: jest.fn(),
        load: jest.fn(),
      },
      redirectTo: jest.fn(),
      onError: jest.fn(),
      onChange: jest.fn(),
      dateRange: { fromDate: '', toDate: '' },
      query: { query: '', language: 'lucene' },
      core: coreMock.createStart(),
      plugins: {
        uiActions: uiActionsPluginMock.createStartContract(),
        data: mockDataPlugin(),
        expressions: expressionsPluginMock.createStartContract(),
        charts: chartPluginMock.createStartContract(),
      },
      palettes: chartPluginMock.createPaletteRegistry(),
      showNoDataPopover: jest.fn(),
    };
    return defaultProps;
  }

  let expressionRendererMock = createExpressionRendererMock();

  describe('loadInitialStore', () => {
    // it.skip('should pass the datasource api for each layer to the visualization', async () => {
    //   let mockVisualization = {
    //     ...createMockVisualization(),
    //     id: 'testVis',
    //     visualizationTypes: [
    //       {
    //         icon: 'empty',
    //         id: 'testVis',
    //         label: 'TEST1',
    //         groupLabel: 'testVisGroup',
    //       },
    //     ],
    //   };
    //   mockDatasource.getLayers.mockReturnValue(['first']);
    //   mockDatasource2.getLayers.mockReturnValue(['second', 'third']);
    //   mockVisualization.getLayerIds.mockReturnValue(['first', 'second', 'third']);
    //   const props = {
    //     ...getDefaultProps(),
    //     visualizationMap: {
    //       testVis: mockVisualization,
    //     },
    //     datasourceMap: {
    //       testDatasource: mockDatasource,
    //       testDatasource2: mockDatasource2,
    //     },

    //     ExpressionRenderer: expressionRendererMock,
    //   };

    //   await mountWithProvider(<EditorFrame {...props} />, {
    //     data: props.plugins.data,
    //     preloadedState: {
    //       persistedDoc: {
    //         visualizationType: 'testVis',
    //         title: '',
    //         state: {
    //           datasourceStates: {
    //             testDatasource: {},
    //             testDatasource2: {},
    //           },
    //           visualization: {},
    //           query: { query: '', language: 'lucene' },
    //           filters: [],
    //         },
    //         references: [],
    //       },
    //       datasourceStates: {
    //         testDatasource: {
    //           isLoading: false,
    //           state: '',
    //         },
    //       },
    //     },
    //   });

    //   expect(mockVisualization.getConfiguration).toHaveBeenCalled();

    //   const datasourceLayers =
    //     mockVisualization.getConfiguration.mock.calls[0][0].frame.datasourceLayers;
    //   expect(datasourceLayers.first).toBe(mockDatasource.publicAPIMock);
    //   expect(datasourceLayers.second).toBe(mockDatasource2.publicAPIMock);
    //   expect(datasourceLayers.third).toBe(mockDatasource2.publicAPIMock);
    // });

    it('does not load a document if there is no initial input', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      const lensStore = mockLensStore({ data: services.data });
      await loadInitialStore(
        redirectCallback,
        undefined,
        services,
        lensStore,
        undefined,
        byValueFlag,
        datasourceMap,
        visualizationMap
      );
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

      const lensStore = await mockLensStore({ data: services.data });
      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(services.data.indexPatterns.get).toHaveBeenCalledWith('1');

      expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } } },
      ]);

      expect(lensStore.getState()).toEqual({
        app: expect.objectContaining({
          persistedDoc: { ...defaultDoc, type: 'lens' },
          query: 'kuery',
          isAppLoading: false,
          activeDatasourceId: 'testDatasource',
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const redirectCallback = jest.fn();
      const services = makeDefaultServices();
      const lensStore = mockLensStore({ data: services.data });

      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          { savedObjectId: '5678' } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();

      const lensStore = mockLensStore({ data: services.data });

      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');

      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
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
      const lensStore = mockLensStore({ data: services.data });
      await act(async () => {
        await loadInitialStore(
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
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
