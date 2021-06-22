/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererProps } from '../../../../../../../src/plugins/expressions/public';
import { FramePublicAPI, Visualization } from '../../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
} from '../../mocks';
import { mockDataPlugin, mountWithProvider } from '../../../mocks';
jest.mock('../../../debounced_component', () => {
  return {
    debouncedComponent: (fn: unknown) => fn,
  };
});

import { WorkspacePanel } from './workspace_panel';
import { mountWithIntl as mount } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { DragDrop, ChildDragDropProvider } from '../../../drag_drop';
import { fromExpression } from '@kbn/interpreter/common';
import { coreMock } from 'src/core/public/mocks';
import { esFilters, IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { UiActionsStart } from '../../../../../../../src/plugins/ui_actions/public';
import { uiActionsPluginMock } from '../../../../../../../src/plugins/ui_actions/public/mocks';
import { TriggerContract } from '../../../../../../../src/plugins/ui_actions/public/triggers';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../../src/plugins/visualizations/public/embeddable';

const defaultPermissions: Record<string, Record<string, boolean | Record<string, boolean>>> = {
  navLinks: { management: true },
  management: { kibana: { indexPatterns: true } },
};

function createCoreStartWithPermissions(newCapabilities = defaultPermissions) {
  const core = coreMock.createStart();
  ((core.application.capabilities as unknown) as Record<
    string,
    Record<string, boolean | Record<string, boolean>>
  >) = newCapabilities;
  return core;
}

const defaultProps = {
  activeDatasourceId: 'mock',
  datasourceStates: {},
  datasourceMap: {},
  framePublicAPI: createMockFramePublicAPI(),
  activeVisualizationId: 'vis',
  visualizationState: {},
  dispatch: () => {},
  ExpressionRenderer: createExpressionRendererMock(),
  core: createCoreStartWithPermissions(),
  plugins: {
    uiActions: uiActionsPluginMock.createStartContract(),
    data: mockDataPlugin(),
  },
  getSuggestionForField: () => undefined,
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
};

describe('workspace_panel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockVisualization2: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: jest.Mock<React.ReactElement, [ReactExpressionRendererProps]>;
  let uiActionsMock: jest.Mocked<UiActionsStart>;
  let trigger: jest.Mocked<TriggerContract>;

  let instance: ReactWrapper;

  beforeEach(() => {
    // These are used in specific tests to assert function calls
    trigger = ({ exec: jest.fn() } as unknown) as jest.Mocked<TriggerContract>;
    uiActionsMock = uiActionsPluginMock.createStartContract();
    uiActionsMock.getTrigger.mockReturnValue(trigger);
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization();
    mockDatasource = createMockDatasource('a');
    expressionRendererMock = createExpressionRendererMock();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render an explanatory text if no visualization is active', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        activeVisualizationId={null}
        visualizationMap={{
          vis: mockVisualization,
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;
    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the visualization does not produce an expression', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => null },
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the datasource does not produce an expression', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render the resulting expression using the expression renderer', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      defaultProps.plugins.data
    );

    instance = mounted.instance;

    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
      "kibana
      | lens_merge_tables layerIds=\\"first\\" tables={datasource}
      | vis"
    `);
  });

  it('should execute a trigger on expression event', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const props = defaultProps;

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...props}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        ExpressionRenderer={expressionRendererMock}
        plugins={{ ...props.plugins, uiActions: uiActionsMock }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    const onEvent = expressionRendererMock.mock.calls[0][0].onEvent!;

    const eventData = {};
    onEvent({ name: 'brush', data: eventData });

    expect(uiActionsMock.getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush);
    expect(trigger.exec).toHaveBeenCalledWith({ data: eventData });
  });

  it('should push add current data table to state on data$ emitting value', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const dispatch = jest.fn();

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        dispatch={dispatch}
        ExpressionRenderer={expressionRendererMock}
      />,
      defaultProps.plugins.data
    );

    instance = mounted.instance;

    const onData = expressionRendererMock.mock.calls[0][0].onData$!;

    const tableData = { table1: { columns: [], rows: [] } };
    onData(undefined, { tables: { tables: tableData } });

    expect(mounted.lensStore.dispatch).toHaveBeenCalledWith({
      type: 'app/onActiveDataChange',
      payload: { activeData: tableData },
    });
  });

  it('should include data fetching for each layer in the expression', async () => {
    const mockDatasource2 = createMockDatasource('a');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
      second: mockDatasource2.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource2.toExpression.mockReturnValue('datasource2');
    mockDatasource2.getLayers.mockReturnValue(['second', 'third']);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
          mock2: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
          mock2: mockDatasource2,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    const ast = fromExpression(instance.find(expressionRendererMock).prop('expression') as string);

    expect(ast.chain[1].arguments.layerIds).toEqual(['first', 'second', 'third']);
    expect(ast.chain[1].arguments.tables).toMatchInlineSnapshot(`
                                    Array [
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource2",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource2",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                    ]
                        `);
  });

  it('should run the expression again if the date range changes', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource.toExpression
      .mockReturnValueOnce('datasource')
      .mockReturnValueOnce('datasource second');

    expressionRendererMock = jest.fn((_arg) => <span />);

    await act(async () => {
      const mounted = await mountWithProvider(
        <WorkspacePanel
          {...defaultProps}
          datasourceStates={{
            mock: {
              state: {},
              isLoading: false,
            },
          }}
          datasourceMap={{
            mock: mockDatasource,
          }}
          framePublicAPI={framePublicAPI}
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          ExpressionRenderer={expressionRendererMock}
        />,
        defaultProps.plugins.data
      );
      instance = mounted.instance;
    });
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      instance.setProps({
        framePublicAPI: {
          ...framePublicAPI,
          dateRange: { fromDate: 'now-90d', toDate: 'now-30d' },
        },
      });
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);
  });

  it('should run the expression again if the filters change', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource.toExpression
      .mockReturnValueOnce('datasource')
      .mockReturnValueOnce('datasource second');

    expressionRendererMock = jest.fn((_arg) => <span />);
    await act(async () => {
      const mounted = await mountWithProvider(
        <WorkspacePanel
          {...defaultProps}
          datasourceStates={{
            mock: {
              state: {},
              isLoading: false,
            },
          }}
          datasourceMap={{
            mock: mockDatasource,
          }}
          framePublicAPI={framePublicAPI}
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          ExpressionRenderer={expressionRendererMock}
        />,
        defaultProps.plugins.data
      );
      instance = mounted.instance;
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
    const field = ({ name: 'myfield' } as unknown) as IFieldType;

    await act(async () => {
      instance.setProps({
        framePublicAPI: {
          ...framePublicAPI,
          filters: [esFilters.buildExistsFilter(field, indexPattern)],
        },
      });
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);
  });

  it('should show an error message if there are missing indexpatterns in the visualization', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockDatasource.checkIntegrity.mockReturnValue(['a']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            // define a layer with an indexpattern not available
            state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="missing-refs-failure"]').exists()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should not show the management action in case of missing indexpattern and no navigation permissions', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            // define a layer with an indexpattern not available
            state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        // Use cannot navigate to the management page
        core={createCoreStartWithPermissions({
          navLinks: { management: false },
          management: { kibana: { indexPatterns: true } },
        })}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(
      instance.find('[data-test-subj="configuration-failure-reconfigure-indexpatterns"]').exists()
    ).toBeFalsy();
  });

  it('should not show the management action in case of missing indexpattern and no indexPattern specific permissions', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            // define a layer with an indexpattern not available
            state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        // user can go to management, but indexPatterns management is not accessible
        core={createCoreStartWithPermissions({
          navLinks: { management: true },
          management: { kibana: { indexPatterns: false } },
        })}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(
      instance.find('[data-test-subj="configuration-failure-reconfigure-indexpatterns"]').exists()
    ).toBeFalsy();
  });

  it('should show an error message if validation on datasource does not pass', async () => {
    mockDatasource.getErrorMessages.mockReturnValue([
      { shortMessage: 'An error occurred', longMessage: 'An long description here' },
    ]);
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="configuration-failure"]').exists()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should show an error message if validation on visualization does not pass', async () => {
    mockDatasource.getErrorMessages.mockReturnValue(undefined);
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockVisualization.getErrorMessages.mockReturnValue([
      { shortMessage: 'Some error happened', longMessage: 'Some long description happened' },
    ]);
    mockVisualization.toExpression.mockReturnValue('vis');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: mockVisualization,
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="configuration-failure"]').exists()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should show an error message if validation on both datasource and visualization do not pass', async () => {
    mockDatasource.getErrorMessages.mockReturnValue([
      { shortMessage: 'An error occurred', longMessage: 'An long description here' },
    ]);
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockVisualization.getErrorMessages.mockReturnValue([
      { shortMessage: 'Some error happened', longMessage: 'Some long description happened' },
    ]);
    mockVisualization.toExpression.mockReturnValue('vis');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: mockVisualization,
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    // EuiFlexItem duplicates internally the attribute, so we need to filter only the most inner one here
    expect(
      instance.find('[data-test-subj="configuration-failure-more-errors"]').last().text()
    ).toEqual(' +1 error');
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should show an error message if the expression fails to parse', async () => {
    mockDatasource.toExpression.mockReturnValue('|||');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
      />,
      defaultProps.plugins.data
    );
    instance = mounted.instance;

    expect(instance.find('[data-test-subj="expression-failure"]').exists()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should not attempt to run the expression again if it does not change', async () => {
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    await act(async () => {
      const mounted = await mountWithProvider(
        <WorkspacePanel
          {...defaultProps}
          datasourceStates={{
            mock: {
              state: {},
              isLoading: false,
            },
          }}
          datasourceMap={{
            mock: mockDatasource,
          }}
          framePublicAPI={framePublicAPI}
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          ExpressionRenderer={expressionRendererMock}
        />,
        defaultProps.plugins.data
      );
      instance = mounted.instance;
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
  });

  it('should attempt to run the expression again if it changes', async () => {
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    await act(async () => {
      const mounted = await mountWithProvider(
        <WorkspacePanel
          {...defaultProps}
          datasourceStates={{
            mock: {
              state: {},
              isLoading: false,
            },
          }}
          datasourceMap={{
            mock: mockDatasource,
          }}
          framePublicAPI={framePublicAPI}
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          ExpressionRenderer={expressionRendererMock}
        />,
        defaultProps.plugins.data
      );
      instance = mounted.instance;
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    expressionRendererMock.mockImplementation((_) => {
      return <span />;
    });

    instance.setProps({ visualizationState: {} });
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    expect(instance.find(expressionRendererMock)).toHaveLength(1);
  });

  describe('suggestions from dropping in workspace panel', () => {
    let mockDispatch: jest.Mock;
    let mockGetSuggestionForField: jest.Mock;
    let frame: jest.Mocked<FramePublicAPI>;

    const draggedField = { id: 'field', humanData: { label: 'Label' } };

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDispatch = jest.fn();
      mockGetSuggestionForField = jest.fn();
    });

    function initComponent(draggingContext = draggedField) {
      instance = mount(
        <ChildDragDropProvider
          dragging={draggingContext}
          setDragging={() => {}}
          setActiveDropTarget={() => {}}
          activeDropTarget={undefined}
          keyboardMode={false}
          setKeyboardMode={() => {}}
          setA11yMessage={() => {}}
          registerDropTarget={jest.fn()}
          dropTargetsByOrder={undefined}
        >
          <WorkspacePanel
            {...defaultProps}
            datasourceStates={{
              mock: {
                state: {},
                isLoading: false,
              },
            }}
            datasourceMap={{
              mock: mockDatasource,
            }}
            framePublicAPI={frame}
            visualizationMap={{
              vis: mockVisualization,
              vis2: mockVisualization2,
            }}
            dispatch={mockDispatch}
            getSuggestionForField={mockGetSuggestionForField}
          />
        </ChildDragDropProvider>
      );
    }

    it('should immediately transition if exactly one suggestion is returned', async () => {
      mockGetSuggestionForField.mockReturnValue({
        visualizationId: 'vis',
        datasourceState: {},
        datasourceId: 'mock',
        visualizationState: {},
      });
      initComponent();

      instance.find(DragDrop).prop('onDrop')!(draggedField, 'field_replace');

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: 'vis',
        initialState: {},
        datasourceState: {},
        datasourceId: 'mock',
      });
    });

    it('should allow to drop if there are suggestions', () => {
      mockGetSuggestionForField.mockReturnValue({
        visualizationId: 'vis',
        datasourceState: {},
        datasourceId: 'mock',
        visualizationState: {},
      });
      initComponent();
      expect(instance.find(DragDrop).prop('dropTypes')).toBeTruthy();
    });

    it('should refuse to drop if there are no suggestions', () => {
      initComponent();
      expect(instance.find(DragDrop).prop('dropType')).toBeFalsy();
    });
  });
});
