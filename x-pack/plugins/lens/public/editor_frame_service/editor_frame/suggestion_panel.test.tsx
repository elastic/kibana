/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
} from '../../mocks';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { esFilters, IFieldType, IndexPattern } from '../../../../../../src/plugins/data/public';
import { SuggestionPanel, SuggestionPanelProps } from './suggestion_panel';
import { getSuggestions, Suggestion } from './suggestion_helpers';
import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import { mountWithProvider } from '../../mocks';

jest.mock('./suggestion_helpers');

const getSuggestionsMock = getSuggestions as jest.Mock;

describe('suggestion_panel', () => {
  let mockVisualization: Visualization;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: ReactExpressionRendererType;

  const suggestion1State = { suggestion1: true };
  const suggestion2State = { suggestion2: true };

  let defaultProps: SuggestionPanelProps;

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
        visualizationId: 'vis',
        title: 'Suggestion1',
        keptLayerIds: ['a'],
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        keptLayerIds: ['a'],
      },
    ] as Suggestion[]);

    defaultProps = {
      activeDatasourceId: 'mock',
      datasourceMap: {
        mock: mockDatasource,
      },
      datasourceStates: {
        mock: {
          isLoading: false,
          state: {},
        },
      },
      activeVisualizationId: 'vis',
      visualizationMap: {
        vis: mockVisualization,
        vis2: createMockVisualization(),
      },
      visualizationState: {},
      ExpressionRenderer: expressionRendererMock,
      frame: createMockFramePublicAPI(),
    };
  });

  it('should list passed in suggestions', async () => {
    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);

    expect(
      instance
        .find('[data-test-subj="lnsSuggestion"]')
        .find(EuiPanel)
        .map((el) => el.parents(EuiToolTip).prop('content'))
    ).toEqual(['Current visualization', 'Suggestion1', 'Suggestion2']);
  });

  describe('uncommitted suggestions', () => {
    let suggestionState: Pick<
      SuggestionPanelProps,
      'datasourceStates' | 'activeVisualizationId' | 'visualizationState'
    >;
    let stagedPreview: SuggestionPanelProps['stagedPreview'];
    beforeEach(() => {
      suggestionState = {
        datasourceStates: {
          mock: {
            isLoading: false,
            state: {},
          },
        },
        activeVisualizationId: 'vis2',
        visualizationState: {},
      };

      stagedPreview = {
        datasourceStates: defaultProps.datasourceStates,
        visualization: {
          state: defaultProps.visualizationState,
          activeId: defaultProps.activeVisualizationId,
        },
      };
    });

    it('should not update suggestions if current state is moved to staged preview', async () => {
      const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);
      getSuggestionsMock.mockClear();
      instance.setProps({
        stagedPreview,
        ...suggestionState,
      });
      instance.update();
      expect(getSuggestionsMock).not.toHaveBeenCalled();
    });

    it('should update suggestions if staged preview is removed', async () => {
      const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);
      getSuggestionsMock.mockClear();
      instance.setProps({
        stagedPreview,
        ...suggestionState,
      });
      instance.update();
      instance.setProps({
        stagedPreview: undefined,
        ...suggestionState,
      });
      instance.update();
      expect(getSuggestionsMock).toHaveBeenCalledTimes(1);
    });

    it('should highlight currently active suggestion', async () => {
      const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);

      act(() => {
        instance.find('[data-test-subj="lnsSuggestion"]').at(2).simulate('click');
      });

      instance.update();

      expect(instance.find('[data-test-subj="lnsSuggestion"]').at(2).prop('className')).toContain(
        'lnsSuggestionPanel__button-isSelected'
      );
    });

    it('should rollback suggestion if current panel is clicked', async () => {
      const { instance, lensStore } = await mountWithProvider(
        <SuggestionPanel {...defaultProps} />
      );

      act(() => {
        instance.find('[data-test-subj="lnsSuggestion"]').at(2).simulate('click');
      });

      instance.update();

      act(() => {
        instance.find('[data-test-subj="lnsSuggestion"]').at(0).simulate('click');
      });

      instance.update();

      expect(lensStore.dispatch).toHaveBeenCalledWith({
        type: 'lens/rollbackSuggestion',
      });
    });
  });

  it('should dispatch visualization switch action if suggestion is clicked', async () => {
    const { instance, lensStore } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);

    act(() => {
      instance.find('button[data-test-subj="lnsSuggestion"]').at(1).simulate('click');
    });
    instance.update();

    expect(lensStore.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lens/selectSuggestion',
        payload: {
          datasourceId: undefined,
          datasourceState: {},
          initialState: { suggestion1: true },
          newVisualizationId: 'vis',
        },
      })
    );
  });

  it('should render render icon if there is no preview expression', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    getSuggestionsMock.mockReturnValue([
      {
        datasourceState: {},
        previewIcon: LensIconChartDatatable,
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');

    // this call will go to the currently active visualization
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('current | preview');

    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    const { instance } = await mountWithProvider(<SuggestionPanel {...defaultProps} />);

    expect(instance.find(EuiIcon)).toHaveLength(1);
    expect(instance.find(EuiIcon).prop('type')).toEqual(LensIconChartDatatable);
  });

  it('should return no suggestion if visualization has missing index-patterns', async () => {
    // create a layer that is referencing an indexPatterns not retrieved by the datasource
    const missingIndexPatternsState = {
      layers: { indexPatternId: 'a' },
      indexPatterns: {},
    };
    mockDatasource.checkIntegrity.mockReturnValue(['a']);
    const newProps = {
      ...defaultProps,
      datasourceStates: {
        mock: {
          ...defaultProps.datasourceStates.mock,
          state: missingIndexPatternsState,
        },
      },
    };

    const { instance } = await mountWithProvider(<SuggestionPanel {...newProps} />);
    expect(instance.html()).toEqual(null);
  });

  it('should render preview expression if there is one', () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');
    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    const indexPattern = ({ id: 'index1' } as unknown) as IndexPattern;
    const field = ({ name: 'myfield' } as unknown) as IFieldType;

    mountWithProvider(
      <SuggestionPanel
        {...defaultProps}
        frame={{
          ...createMockFramePublicAPI(),
          filters: [esFilters.buildExistsFilter(field, indexPattern)],
        }}
      />
    );

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
