/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Visualization, Suggestion } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
} from '../../mocks';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import { SuggestionPanel, SuggestionPanelProps, SuggestionPanelWrapper } from './suggestion_panel';
import { getSuggestions } from './suggestion_helpers';
import { EuiIcon, EuiPanel, EuiToolTip, EuiAccordion } from '@elastic/eui';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import { mountWithProvider } from '../../mocks';
import {
  applyChanges,
  LensAppState,
  PreviewState,
  setState,
  setToggleFullscreen,
  VisualizationState,
} from '../../state_management';
import { setChangesApplied } from '../../state_management/lens_slice';

const SELECTORS = {
  APPLY_CHANGES_BUTTON: 'button[data-test-subj="lnsApplyChanges__suggestions"]',
  SUGGESTIONS_PANEL: '[data-test-subj="lnsSuggestionsPanel"]',
  SUGGESTION_TILE_BUTTON: 'button[data-test-subj="lnsSuggestion"]',
};

jest.mock('./suggestion_helpers');

const getSuggestionsMock = getSuggestions as jest.Mock;

describe('suggestion_panel', () => {
  let mockVisualization: Visualization;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: ReactExpressionRendererType;

  const suggestion1State = { suggestion1: true };
  const suggestion2State = { suggestion2: true };

  let defaultProps: SuggestionPanelProps;

  let preloadedState: Partial<LensAppState>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockDatasource = createMockDatasource('a');
    expressionRendererMock = createExpressionRendererMock();

    getSuggestionsMock.mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
        keptLayerIds: ['a'],
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
        keptLayerIds: ['a'],
      },
    ] as Suggestion[]);

    preloadedState = {
      datasourceStates: {
        testDatasource: {
          isLoading: false,
          state: '',
        },
      },
      visualization: {
        activeId: 'testVis',
        state: {},
      },
      activeDatasourceId: 'testDatasource',
    };

    defaultProps = {
      datasourceMap: {
        testDatasource: mockDatasource,
      },
      visualizationMap: {
        testVis: mockVisualization,
        vis2: createMockVisualization(),
      },
      ExpressionRenderer: expressionRendererMock,
      frame: createMockFramePublicAPI(),
    };
  });

  it('should avoid completely to render SuggestionPanel when in fullscreen mode', async () => {
    const { instance, lensStore } = await mountWithProvider(
      <SuggestionPanelWrapper {...defaultProps} />
    );
    expect(instance.find(SuggestionPanel).exists()).toBe(true);

    lensStore.dispatch(setToggleFullscreen());
    instance.update();
    expect(instance.find(SuggestionPanel).exists()).toBe(false);

    lensStore.dispatch(setToggleFullscreen());
    instance.update();
    expect(instance.find(SuggestionPanel).exists()).toBe(true);
  });

  it('should display apply-changes prompt when changes not applied', async () => {
    const { instance, lensStore } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
      preloadedState: {
        ...preloadedState,
        visualization: {
          ...preloadedState.visualization,
          state: {
            something: 'changed',
          },
        } as VisualizationState,
        changesApplied: false,
        autoApplyDisabled: true,
      },
    });

    expect(instance.exists(SELECTORS.APPLY_CHANGES_BUTTON)).toBeTruthy();
    expect(instance.exists(SELECTORS.SUGGESTION_TILE_BUTTON)).toBeFalsy();

    instance.find(SELECTORS.APPLY_CHANGES_BUTTON).simulate('click');

    // check changes applied
    expect(lensStore.dispatch).toHaveBeenCalledWith(applyChanges());

    // simulate workspace panel behavior
    lensStore.dispatch(setChangesApplied(true));
    instance.update();

    // check UI updated
    expect(instance.exists(SELECTORS.APPLY_CHANGES_BUTTON)).toBeFalsy();
    expect(instance.exists(SELECTORS.SUGGESTION_TILE_BUTTON)).toBeTruthy();
  });

  it('should list passed in suggestions', async () => {
    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
      preloadedState,
    });

    expect(
      instance
        .find('[data-test-subj="lnsSuggestion"]')
        .find(EuiPanel)
        .map((el) => el.parents(EuiToolTip).prop('content'))
    ).toEqual(['Current visualization', 'Suggestion1', 'Suggestion2']);
  });

  describe('uncommitted suggestions', () => {
    let suggestionState: Pick<LensAppState, 'datasourceStates' | 'visualization'>;
    let stagedPreview: PreviewState;
    beforeEach(() => {
      suggestionState = {
        datasourceStates: {
          testDatasource: {
            isLoading: false,
            state: '',
          },
        },
        visualization: {
          activeId: 'vis2',
          state: {},
        },
      };

      stagedPreview = {
        datasourceStates: preloadedState.datasourceStates!,
        visualization: preloadedState.visualization!,
      };
    });

    it('should not update suggestions if current state is moved to staged preview', async () => {
      const { instance, lensStore } = await mountWithProvider(
        <SuggestionPanel {...defaultProps} />,
        { preloadedState }
      );
      getSuggestionsMock.mockClear();
      lensStore.dispatch(setState({ stagedPreview }));
      instance.update();
      expect(getSuggestionsMock).not.toHaveBeenCalled();
    });

    it('should update suggestions if staged preview is removed', async () => {
      const { instance, lensStore } = await mountWithProvider(
        <SuggestionPanel {...defaultProps} />,
        { preloadedState }
      );
      getSuggestionsMock.mockClear();
      lensStore.dispatch(setState({ stagedPreview, ...suggestionState }));
      instance.update();
      lensStore.dispatch(setState({ stagedPreview: undefined, ...suggestionState }));
      instance.update();
      expect(getSuggestionsMock).toHaveBeenCalledTimes(1);
    });

    it('should highlight currently active suggestion', async () => {
      const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
        preloadedState,
      });
      act(() => {
        instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(2).simulate('click');
      });

      instance.update();

      expect(instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(2).prop('className')).toContain(
        'lnsSuggestionPanel__button-isSelected'
      );
    });

    it('should rollback suggestion if current panel is clicked', async () => {
      const { instance, lensStore } = await mountWithProvider(
        <SuggestionPanel {...defaultProps} />
      );

      act(() => {
        instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(2).simulate('click');
      });

      instance.update();

      act(() => {
        instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(0).simulate('click');
      });

      instance.update();

      expect(lensStore.dispatch).toHaveBeenCalledWith({
        type: 'lens/rollbackSuggestion',
      });
      // check that it immediately applied any state changes in case auto-apply disabled
      expect(lensStore.dispatch).toHaveBeenLastCalledWith({
        type: applyChanges.type,
      });
    });
  });

  it('should dispatch visualization switch action if suggestion is clicked', async () => {
    const { instance, lensStore } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
      preloadedState,
    });

    act(() => {
      instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(1).simulate('click');
    });

    expect(lensStore.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            datasourceId: undefined,
            datasourceState: {},
            visualizationState: { suggestion1: true },
            newVisualizationId: 'testVis',
          },
        },
      })
    );
    expect(lensStore.dispatch).toHaveBeenLastCalledWith({ type: applyChanges.type });
  });

  it('should render render icon if there is no preview expression', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    getSuggestionsMock.mockReturnValue([
      {
        datasourceState: {},
        previewIcon: LensIconChartDatatable,
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');

    // this call will go to the currently active visualization
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('current | preview');

    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
      preloadedState,
    });

    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL).find(EuiIcon)).toHaveLength(1);
    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL).find(EuiIcon).prop('type')).toEqual(
      LensIconChartDatatable
    );
  });

  it('should return no suggestion if visualization has missing index-patterns', async () => {
    // create a layer that is referencing an indexPatterns not retrieved by the datasource
    const missingIndexPatternsState = {
      layers: { indexPatternId: 'a' },
      indexPatterns: {},
    };
    mockDatasource.checkIntegrity.mockReturnValue(['a']);

    const newPreloadedState = {
      ...preloadedState,
      datasourceStates: {
        testDatasource: {
          ...preloadedState.datasourceStates!.testDatasource,
          state: missingIndexPatternsState,
        },
      },
    };

    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />, {
      preloadedState: newPreloadedState,
    });
    expect(instance.html()).toEqual(null);
  });

  it('should hide the selections when the accordion is hidden', async () => {
    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);
    expect(instance.find(EuiAccordion)).toHaveLength(1);
    act(() => {
      instance.find(EuiAccordion).at(0).simulate('change');
    });

    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL)).toEqual({});
  });

  it('should render preview expression if there is one', () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');
    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    mountWithProvider(<SuggestionPanel {...defaultProps} frame={createMockFramePublicAPI()} />);

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    const passedExpression = (expressionRendererMock as jest.Mock).mock.calls[0][0].expression;

    expect(passedExpression).toMatchInlineSnapshot(`
      "kibana
      | lens_merge_tables layerIds=\\"first\\" tables={datasource_expression}
      | test
      | expression"
    `);
  });
});
