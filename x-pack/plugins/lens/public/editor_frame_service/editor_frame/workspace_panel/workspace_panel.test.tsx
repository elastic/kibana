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
} from '../../../mocks';
import { mockDataPlugin, mountWithProvider } from '../../../mocks';
jest.mock('../../../debounced_component', () => {
  return {
    debouncedComponent: (fn: unknown) => fn,
  };
});

import { WorkspacePanel } from './workspace_panel';
import { ReactWrapper } from 'enzyme';
import { DragDrop, ChildDragDropProvider } from '../../../drag_drop';
import { fromExpression } from '@kbn/interpreter';
import { buildExistsFilter } from '@kbn/es-query';
import { coreMock } from 'src/core/public/mocks';
import { DataView } from '../../../../../../../src/plugins/data_views/public';
import type { FieldSpec } from '../../../../../../../src/plugins/data/common';
import { UiActionsStart } from '../../../../../../../src/plugins/ui_actions/public';
import { uiActionsPluginMock } from '../../../../../../../src/plugins/ui_actions/public/mocks';
import { TriggerContract } from '../../../../../../../src/plugins/ui_actions/public/triggers';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../../src/plugins/visualizations/public/embeddable';
import {
  applyChanges,
  setState,
  updateDatasourceState,
  updateVisualizationState,
} from '../../../state_management';
import { getLensInspectorService } from '../../../lens_inspector_service';
import { inspectorPluginMock } from '../../../../../../../src/plugins/inspector/public/mocks';
import { disableAutoApply, enableAutoApply } from '../../../state_management/lens_slice';

const defaultPermissions: Record<string, Record<string, boolean | Record<string, boolean>>> = {
  navLinks: { management: true },
  management: { kibana: { indexPatterns: true } },
};

function createCoreStartWithPermissions(newCapabilities = defaultPermissions) {
  const core = coreMock.createStart();
  (core.application.capabilities as unknown as Record<
    string,
    Record<string, boolean | Record<string, boolean>>
  >) = newCapabilities;
  return core;
}

const defaultProps = {
  datasourceMap: {},
  framePublicAPI: createMockFramePublicAPI(),
  ExpressionRenderer: createExpressionRendererMock(),
  core: createCoreStartWithPermissions(),
  plugins: {
    uiActions: uiActionsPluginMock.createStartContract(),
    data: mockDataPlugin(),
  },
  getSuggestionForField: () => undefined,
  lensInspector: getLensInspectorService(inspectorPluginMock.createStartContract()),
  toggleFullscreen: jest.fn(),
};

const SELECTORS = {
  applyChangesButton: 'button[data-test-subj="lnsWorkspaceApplyChanges"]',
  dragDropPrompt: '[data-test-subj="workspace-drag-drop-prompt"]',
  applyChangesPrompt: '[data-test-subj="workspace-apply-changes-prompt"]',
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
    trigger = { exec: jest.fn() } as unknown as jest.Mocked<TriggerContract>;
    uiActionsMock = uiActionsPluginMock.createStartContract();
    uiActionsMock.getTrigger.mockReturnValue(trigger);
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization();
    mockDatasource = createMockDatasource('testDatasource');
    expressionRendererMock = createExpressionRendererMock();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render an explanatory text if no visualization is active', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        visualizationMap={{
          testVis: mockVisualization,
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      {
        preloadedState: { visualization: { activeId: null, state: {} }, datasourceStates: {} },
      }
    );
    instance = mounted.instance;
    instance.update();

    expect(instance.find('[data-test-subj="workspace-drag-drop-prompt"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the visualization does not produce an expression', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => null },
        }}
      />,

      { preloadedState: { datasourceStates: {} } }
    );
    instance = mounted.instance;
    instance.update();

    expect(instance.find('[data-test-subj="workspace-drag-drop-prompt"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the datasource does not produce an expression', async () => {
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
      />,

      { preloadedState: { datasourceStates: {} } }
    );
    instance = mounted.instance;
    instance.update();

    expect(instance.find('[data-test-subj="workspace-drag-drop-prompt"]')).toHaveLength(2);
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    instance = mounted.instance;

    instance.update();

    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
      "kibana
      | lens_merge_tables layerIds=\\"first\\" tables={datasource}
      | testVis"
    `);
  });

  it('should give user control when auto-apply disabled', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      {
        preloadedState: {
          autoApplyDisabled: true,
        },
      }
    );

    instance = mounted.instance;
    instance.update();

    const getExpression = () => instance.find(expressionRendererMock).prop('expression');

    // allows initial render
    expect(getExpression()).toMatchInlineSnapshot(`
    "kibana
    | lens_merge_tables layerIds=\\"first\\" tables={datasource}
    | testVis"
  `);

    mockDatasource.toExpression.mockReturnValue('new-datasource');
    act(() => {
      instance.setProps({
        visualizationMap: {
          testVis: { ...mockVisualization, toExpression: () => 'new-vis' },
        },
      });
    });
    instance.update();

    expect(getExpression()).toMatchInlineSnapshot(`
    "kibana
    | lens_merge_tables layerIds=\\"first\\" tables={datasource}
    | testVis"
  `);

    act(() => {
      mounted.lensStore.dispatch(applyChanges());
    });
    instance.update();

    // should update
    expect(getExpression()).toMatchInlineSnapshot(`
    "kibana
    | lens_merge_tables layerIds=\\"first\\" tables={new-datasource}
    | new-vis"
  `);

    mockDatasource.toExpression.mockReturnValue('other-new-datasource');
    act(() => {
      instance.setProps({
        visualizationMap: {
          testVis: { ...mockVisualization, toExpression: () => 'other-new-vis' },
        },
      });
      mounted.lensStore.dispatch(enableAutoApply());
    });
    instance.update();

    // reenabling auto-apply triggers an update as well
    expect(getExpression()).toMatchInlineSnapshot(`
    "kibana
    | lens_merge_tables layerIds=\\"first\\" tables={other-new-datasource}
    | other-new-vis"
  `);
  });

  it('should base saveability on working changes when auto-apply disabled', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockVisualization.getErrorMessages.mockImplementation((currentVisualizationState: any) => {
      if (currentVisualizationState.hasProblem) {
        return [{ shortMessage: 'An error occurred', longMessage: 'An long description here' }];
      } else {
        return [];
      }
    });

    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    instance = mounted.instance;
    const isSaveable = () => mounted.lensStore.getState().lens.isSaveable;

    instance.update();

    // allows initial render
    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
    "kibana
    | lens_merge_tables layerIds=\\"first\\" tables={datasource}
    | testVis"
  `);
    expect(isSaveable()).toBe(true);

    act(() => {
      mounted.lensStore.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          newState: { activeId: 'testVis', hasProblem: true },
        })
      );
    });
    instance.update();

    expect(isSaveable()).toBe(false);
  });

  it('should show proper workspace prompts when auto-apply disabled', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const configureValidVisualization = () => {
      mockVisualization.toExpression.mockReturnValue('testVis');
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      act(() => {
        instance.setProps({
          visualizationMap: {
            testVis: { ...mockVisualization, toExpression: () => 'new-vis' },
          },
        });
      });
    };

    const deleteVisualization = () => {
      act(() => {
        instance.setProps({
          visualizationMap: {
            testVis: { ...mockVisualization, toExpression: () => null },
          },
        });
      });
    };

    const dragDropPromptShowing = () => instance.exists(SELECTORS.dragDropPrompt);

    const applyChangesPromptShowing = () => instance.exists(SELECTORS.applyChangesPrompt);

    const visualizationShowing = () => instance.exists(expressionRendererMock);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: mockVisualization,
        }}
        ExpressionRenderer={expressionRendererMock}
      />,
      {
        preloadedState: {
          autoApplyDisabled: true,
        },
      }
    );

    instance = mounted.instance;
    instance.update();

    expect(dragDropPromptShowing()).toBeTruthy();

    configureValidVisualization();
    instance.update();

    expect(dragDropPromptShowing()).toBeFalsy();
    expect(applyChangesPromptShowing()).toBeTruthy();

    instance.find(SELECTORS.applyChangesButton).simulate('click');
    instance.update();

    expect(visualizationShowing()).toBeTruthy();

    deleteVisualization();
    instance.update();

    expect(visualizationShowing()).toBeTruthy();

    act(() => {
      mounted.lensStore.dispatch(applyChanges());
    });
    instance.update();

    expect(visualizationShowing()).toBeFalsy();
    expect(dragDropPromptShowing()).toBeTruthy();

    configureValidVisualization();
    instance.update();

    expect(dragDropPromptShowing()).toBeFalsy();
    expect(applyChangesPromptShowing()).toBeTruthy();
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
        plugins={{ ...props.plugins, uiActions: uiActionsMock }}
      />
    );
    instance = mounted.instance;

    const onEvent = expressionRendererMock.mock.calls[0][0].onEvent!;

    const eventData = { myData: true, table: { rows: [], columns: [] }, column: 0 };
    onEvent({ name: 'brush', data: eventData });

    expect(uiActionsMock.getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush);
    expect(trigger.exec).toHaveBeenCalledWith({ data: { ...eventData, timeFieldName: undefined } });
  });

  it('should push add current data table to state on data$ emitting value', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['table1']);

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    instance = mounted.instance;

    const onData = expressionRendererMock.mock.calls[0][0].onData$!;

    const tablesData = {
      table1: { columns: [], rows: [] },
      table2: { columns: [], rows: [] },
    };
    onData(undefined, { tables: { tables: tablesData } });

    expect(mounted.lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/onActiveDataChange',
      payload: tablesData,
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
        datasourceMap={{
          testDatasource: mockDatasource,
          mock2: mockDatasource2,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />,

      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
            mock2: {
              state: {},
              isLoading: false,
            },
          },
        },
      }
    );
    instance = mounted.instance;
    instance.update();

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

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );
    instance = mounted.instance;
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    act(() => {
      instance.setProps({
        framePublicAPI: {
          ...framePublicAPI,
          dateRange: { fromDate: 'now-90d', toDate: 'now-30d' },
        },
      });
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(3);
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
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );
    instance = mounted.instance;

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    const indexPattern = { id: 'index1' } as unknown as DataView;
    const field = { name: 'myfield' } as unknown as FieldSpec;

    act(() => {
      instance.setProps({
        framePublicAPI: {
          ...framePublicAPI,
          filters: [buildExistsFilter(field, indexPattern)],
        },
      });
    });

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(3);
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
      />,

      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              // define a layer with an indexpattern not available
              state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
              isLoading: false,
            },
          },
        },
      }
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        // Use cannot navigate to the management page
        core={createCoreStartWithPermissions({
          navLinks: { management: false },
          management: { kibana: { indexPatterns: true } },
        })}
      />,

      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              // define a layer with an indexpattern not available
              state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
              isLoading: false,
            },
          },
        },
      }
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        // user can go to management, but indexPatterns management is not accessible
        core={createCoreStartWithPermissions({
          navLinks: { management: true },
          management: { kibana: { indexPatterns: false } },
        })}
      />,

      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              // define a layer with an indexpattern not available
              state: { layers: { indexPatternId: 'a' }, indexPatterns: {} },
              isLoading: false,
            },
          },
        },
      }
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
      />
    );
    instance = mounted.instance;
    act(() => {
      instance.update();
    });

    expect(instance.find('[data-test-subj="configuration-failure"]').exists()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should show an error message if validation on visualization does not pass', async () => {
    mockDatasource.getErrorMessages.mockReturnValue(undefined);
    mockDatasource.getLayers.mockReturnValue(['first']);
    mockVisualization.getErrorMessages.mockReturnValue([
      { shortMessage: 'Some error happened', longMessage: 'Some long description happened' },
    ]);
    mockVisualization.toExpression.mockReturnValue('testVis');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: mockVisualization,
        }}
      />
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
    mockVisualization.toExpression.mockReturnValue('testVis');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: mockVisualization,
        }}
      />
    );
    instance = mounted.instance;

    // EuiFlexItem duplicates internally the attribute, so we need to filter only the most inner one here
    expect(
      instance.find('[data-test-subj="configuration-failure-more-errors"]').last().text()
    ).toEqual(' +1 error');
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should NOT display errors for unapplied changes', async () => {
    // this test is important since we don't want the workspace panel to
    // display errors if the user has disabled auto-apply, messed something up,
    // but not yet applied their changes

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDatasource.getErrorMessages.mockImplementation((currentDatasourceState: any) => {
      if (currentDatasourceState.hasProblem) {
        return [{ shortMessage: 'An error occurred', longMessage: 'An long description here' }];
      } else {
        return [];
      }
    });
    mockDatasource.getLayers.mockReturnValue(['first']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockVisualization.getErrorMessages.mockImplementation((currentVisualizationState: any) => {
      if (currentVisualizationState.hasProblem) {
        return [{ shortMessage: 'An error occurred', longMessage: 'An long description here' }];
      } else {
        return [];
      }
    });
    mockVisualization.toExpression.mockReturnValue('testVis');
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: mockVisualization,
        }}
      />
    );

    instance = mounted.instance;
    const lensStore = mounted.lensStore;

    const showingErrors = () =>
      instance.exists('[data-test-subj="configuration-failure-error"]') ||
      instance.exists('[data-test-subj="configuration-failure-more-errors"]');

    expect(showingErrors()).toBeFalsy();

    act(() => {
      lensStore.dispatch(disableAutoApply());
    });
    instance.update();

    expect(showingErrors()).toBeFalsy();

    // introduce some issues
    act(() => {
      lensStore.dispatch(
        updateDatasourceState({
          datasourceId: 'testDatasource',
          updater: { hasProblem: true },
        })
      );
    });
    instance.update();

    expect(showingErrors()).toBeFalsy();

    act(() => {
      lensStore.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          newState: { activeId: 'testVis', hasProblem: true },
        })
      );
    });
    instance.update();

    expect(showingErrors()).toBeFalsy();

    // errors should appear when problem changes are applied
    instance.find(SELECTORS.applyChangesButton).simulate('click');
    instance.update();

    expect(showingErrors()).toBeTruthy();
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
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
      />
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

    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );
    instance = mounted.instance;
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);
  });

  it('should attempt to run the expression again if it changes', async () => {
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    const mounted = await mountWithProvider(
      <WorkspacePanel
        {...defaultProps}
        datasourceMap={{
          testDatasource: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        }}
        ExpressionRenderer={expressionRendererMock}
      />
    );
    instance = mounted.instance;
    const lensStore = mounted.lensStore;

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    expressionRendererMock.mockImplementation((_) => {
      return <span />;
    });

    lensStore!.dispatch(
      setState({
        visualization: {
          activeId: 'testVis',
          state: {},
        },
      })
    );
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(3);

    expect(instance.find(expressionRendererMock)).toHaveLength(1);
  });

  describe('suggestions from dropping in workspace panel', () => {
    let mockGetSuggestionForField: jest.Mock;
    let frame: jest.Mocked<FramePublicAPI>;

    const draggedField = { id: 'field', humanData: { label: 'Label' } };

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockGetSuggestionForField = jest.fn();
    });

    async function initComponent(draggingContext = draggedField) {
      const mounted = await mountWithProvider(
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
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            framePublicAPI={frame}
            visualizationMap={{
              testVis: mockVisualization,
              vis2: mockVisualization2,
            }}
            getSuggestionForField={mockGetSuggestionForField}
          />
        </ChildDragDropProvider>
      );
      instance = mounted.instance;
      return mounted;
    }

    it('should immediately transition if exactly one suggestion is returned', async () => {
      mockGetSuggestionForField.mockReturnValue({
        visualizationId: 'testVis',
        datasourceState: {},
        datasourceId: 'testDatasource',
        visualizationState: {},
      });
      const { lensStore } = await initComponent();

      instance.find(DragDrop).prop('onDrop')!(draggedField, 'field_replace');

      expect(lensStore.dispatch).toHaveBeenCalledWith({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            newVisualizationId: 'testVis',
            visualizationState: {},
            datasourceState: {},
            datasourceId: 'testDatasource',
          },
          clearStagedPreview: true,
        },
      });
    });

    it('should allow to drop if there are suggestions', async () => {
      mockGetSuggestionForField.mockReturnValue({
        visualizationId: 'testVis',
        datasourceState: {},
        datasourceId: 'testDatasource',
        visualizationState: {},
      });
      await initComponent();
      expect(instance.find(DragDrop).prop('dropTypes')).toBeTruthy();
    });

    it('should refuse to drop if there are no suggestions', async () => {
      await initComponent();
      expect(instance.find(DragDrop).prop('dropType')).toBeFalsy();
    });
  });
});
