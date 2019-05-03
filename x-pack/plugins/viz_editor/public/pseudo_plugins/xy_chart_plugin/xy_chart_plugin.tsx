/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiSuperSelect,
  EuiSwitch,
  IconType,
  EuiButtonGroup,
} from '@elastic/eui';
import React from 'react';
import { DatasourceField, fieldToOperation, SelectOperation } from '../../../common';
import {
  EditorPlugin,
  getOperatorsForField,
  isApplicableForCardinality,
  operationToName,
  Suggestion,
  UnknownVisModel,
  VisualizationPanelProps,
} from '../../../public';
import { DroppablePane } from '../../frame/main/droppable_pane';
import { SeriesAxisEditor } from './seriesaxis_editor';
import { prefillPrivateState, updateXyState } from './state_helpers';
import { PLUGIN_NAME, XyChartVisModel, XyDisplayType } from './types';
import { XAxisEditor } from './xaxis_editor';
import { YAxisEditor } from './yaxis_editor';
import { EuiSpacer } from '@elastic/eui';

function lnsConfigPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<XyChartVisModel>) {
  if (!visModel.private.xyChart) {
    return <>No chart configured</>;
  }

  const {
    private: {
      xyChart: { xAxis, yAxis, seriesAxis, displayType, stacked },
    },
  } = visModel;

  const displayOptions = [
    {
      id: 'line',
      label: 'Line',
      iconType: 'visLine',
    },
    {
      id: 'area',
      label: 'Area',
      iconType: 'visArea',
    },
    {
      id: 'bar',
      label: 'Bar',
      iconType: 'visBarVertical',
    },
  ];

  return (
    <>
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Display type</span>
        <EuiSpacer size="s" />
        <EuiButtonGroup
          legend="Display type"
          isIconOnly
          options={displayOptions}
          idSelected={displayType || 'line'}
          isFullWidth
          onChange={(id) => {
            const updatedVisModel = updateXyState(visModel, { displayType: id as XyDisplayType });
            onChangeVisModel(updatedVisModel);
          }}
        />

        <EuiSpacer size="m" />
        <EuiSwitch
          label="Stacked"
          checked={stacked}
          onChange={() => {
            onChangeVisModel(updateXyState(visModel, { stacked: !stacked }));
          }}
        />
      </div>
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Y-axis</span>
        {yAxis.columns.map(col => (
          <YAxisEditor
            key={col}
            operationId={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
            getSuggestions={getSuggestions}
          />
        ))}
      </div>
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Split series by</span>
        {seriesAxis.columns.map(col => (
          <SeriesAxisEditor
            key={col}
            operationId={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
          />
        ))}
      </div>
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">X-axis</span>
        {xAxis.columns.map(col => (
          <XAxisEditor
            key={col}
            operationId={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
            getSuggestions={getSuggestions}
          />
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: XyChartVisModel, mode: 'preview' | 'view' | 'edit' = 'view') {
  if (!viewState.private.xyChart) {
    return '';
  }

  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  return `
    xy_chart
      hideTooltips=${mode === 'preview'}
      hideAxes=${mode === 'preview'}
      displayType=${viewState.private.xyChart.displayType || 'line'}
      stacked=${viewState.private.xyChart.stacked ? 'true' : 'false'}
  `;
}

const displayTypeIcon: { [type: string]: IconType } = {
  line: 'visLine',
  area: 'visArea',
  bar: 'visBarVertical',
};

function buildSuggestion(
  visModel: XyChartVisModel,
  options?: {
    title?: string;
    iconType?: IconType;
  },
  score: number = 0.7
) {
  const title = [visModel.private.xyChart.yAxis.title, visModel.private.xyChart.xAxis.title].join(
    ' over '
  );

  return {
    title,
    visModel,
    previewExpression: toExpression(visModel, 'preview'),
    score,
    iconType: displayTypeIcon.line,
    pluginName: PLUGIN_NAME,
    category: 'line',
    ...options,
  } as Suggestion;
}

function getSuggestion(
  visModel: XyChartVisModel,
  displayType: XyDisplayType,
  title: string
): Suggestion[] {
  const firstQuery = Object.values(visModel.queries)[0];

  if (!firstQuery || (firstQuery && firstQuery.select.length < 2)) {
    return [];
  }
  const containsSingleValueMetric = firstQuery.select.some(({ operator }) =>
    isApplicableForCardinality(operator, 'single')
  );
  if (!containsSingleValueMetric) {
    return [];
  }
  const prefilledVisModel = prefillPrivateState(
    visModel as UnknownVisModel,
    displayType
  ) as XyChartVisModel;
  return [buildSuggestion(prefilledVisModel, { title, iconType: displayTypeIcon[displayType] })];
}

function buildViewModel(
  visModel: XyChartVisModel,
  xAxis: SelectOperation[],
  yAxis: SelectOperation[],
  seriesAxis: SelectOperation[]
): XyChartVisModel {
  const formattedNameX = xAxis
    .map(op => operationToName(op.operator) + ('argument' in op ? ` of ${op.argument.field}` : ''))
    .join(', ');
  const formattedNameY = yAxis
    .map(op => operationToName(op.operator) + ('argument' in op ? ` of ${op.argument.field}` : ''))
    .join(', ');

  const formattedSplitName = `split by ${seriesAxis
    .map(op => operationToName(op.operator) + ('argument' in op ? ` of ${op.argument.field}` : ''))
    .join(', ')}`;

  return {
    ...visModel,
    queries: {
      xyChartQuery: {
        datasourceRef: visModel.datasource!.title,
        // Split by Y values, then bucket by X
        select: seriesAxis.concat(yAxis).concat(xAxis),
      },
    },
    editorPlugin: PLUGIN_NAME,
    private: {
      ...visModel.private,
      xyChart: {
        ...visModel.private.xyChart,
        xAxis: {
          title: formattedNameX,
          columns: xAxis.map(column => `xyChartQuery_${column.id}`),
        },
        seriesAxis: {
          title: formattedSplitName,
          columns: seriesAxis.map(column => `xyChartQuery_${column.id}`),
        },
        yAxis: {
          title: formattedNameY,
          columns: yAxis.map(column => `xyChartQuery_${column.id}`),
        },
      },
    },
  };
}

function _getSuggestionsForFieldAsXOrY(
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const { datasource } = visModel;

  if (!datasource) {
    return [];
  }

  const firstQuery = Object.values(visModel.queries)[0];
  const firstQueryKey = Object.keys(visModel.queries)[0];
  const possibleOperator = getOperatorsForField(field)[0];
  const possibleOperation = fieldToOperation(field, possibleOperator);

  const isMultiOperation = isApplicableForCardinality(firstQuery.select[0].operator, 'multi');
  const extendedQueryState = {
    ...visModel,
    queries: {
      ...visModel.queries,
      [firstQueryKey]: {
        ...firstQuery,
        // add columns in the right order for xy chart to pick up
        select: isMultiOperation
          ? [possibleOperation, ...firstQuery.select]
          : [...firstQuery.select, possibleOperation],
      },
    },
  };
  const newVisModel = buildViewModel(
    extendedQueryState,
    [extendedQueryState.queries[firstQueryKey]!.select[1]],
    [extendedQueryState.queries[firstQueryKey]!.select[0]],
    []
  );

  return [
    buildSuggestion(
      newVisModel,
      {
        iconType: displayTypeIcon.line,
      },
      0.8
    ),
  ];
}

function _getSuggestionsForFieldAsInitialState(
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const { datasource } = visModel;

  if (!datasource) {
    return [];
  }

  if (field.type === 'number') {
    if (datasource.timeFieldName) {
      const dateField = datasource.fields.find(f => f.name === datasource.timeFieldName)!;
      const xAxis = [fieldToOperation(dateField, getOperatorsForField(dateField, false, true)[0])];
      const yAxis = [fieldToOperation(field, getOperatorsForField(field, true, false)[0])];

      const newVisModel = buildViewModel(visModel, xAxis, yAxis, []);

      return [
        buildSuggestion(
          newVisModel,
          {
            iconType: displayTypeIcon.line,
          },
          0.9
        ),
      ];
    } else {
      return [];
    }
  }

  if (field.type === 'date' || field.type === 'string') {
    const xAxis = [fieldToOperation(field, getOperatorsForField(field, false, true)[0])];
    const yAxis = [fieldToOperation(field, 'count')];

    const newVisModel = updateXyState(buildViewModel(visModel, xAxis, yAxis, []), {
      displayType: field.type === 'date' ? 'line' : 'bar',
    });

    return [
      buildSuggestion(
        newVisModel,
        {
          iconType: field.type === 'date' ? displayTypeIcon.line : displayTypeIcon.bar,
        },
        0.9
      ),
    ];
  }

  return [];

  // let suggestions = [] as Array<Suggestion | null>;

  // const opToSuggestion = (op: SelectOperator): Suggestion | null => {
  //   let xAxis = [];
  //   let yAxis = [];

  //   if (op === 'count') {
  //     return null;
  //   }

  //   xAxis = [fieldToOperation(field, op)];
  //   yAxis = [fieldToOperation(field, 'count')];
  // };

  // const opWithDateHistogram = (op: SelectOperator): Suggestion | null => {
  //   let xAxis = [];
  //   let yAxis = [];
  //   let seriesAxis: SelectOperation[] = [];

  //   if (op === 'column') {
  //     xAxis = [
  //       fieldToOperation(
  //         datasource.fields.find(f => f.name === datasource.timeFieldName)!,
  //         'column'
  //       ),
  //     ];
  //     yAxis = [fieldToOperation(field, op)];
  //   } else {
  //     xAxis = [
  //       fieldToOperation(
  //         datasource.fields.find(f => f.name === datasource.timeFieldName)!,
  //         'date_histogram'
  //       ),
  //     ];

  //     if (op === 'count') {
  //       return null;
  //     } else {
  //       seriesAxis = [fieldToOperation(field, op)];
  //       yAxis = [fieldToOperation(field, 'count')];
  //     }
  //   }

  //   const newVisModel = buildViewModel(visModel, xAxis, yAxis, seriesAxis);

  //   return buildSuggestion(newVisModel, {
  //     iconType: displayTypeIcon.line,
  //   });
  // };

  // if (datasource!.timeFieldName && datasource!.timeFieldName !== field.name) {
  //   suggestions = suggestions.concat(
  //     getOperatorsForField(field, false, true).map(op => opWithDateHistogram(op))
  //   );
  // }

  // suggestions = suggestions.concat(getOperatorsForField(field, false, true).map(opToSuggestion));

  // return suggestions.filter(suggestion => !!suggestion) as Suggestion[];
}

function _getSuggestionsForFieldAsSplit(
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const firstQuery = Object.values(visModel.queries)[0];
  const firstQueryKey = Object.keys(visModel.queries)[0];
  const possibleOperator =
    field.type === 'number'
      ? getOperatorsForField(field, true, false)[0]
      : getOperatorsForField(field, false, true)[0];
  const possibleOperation = fieldToOperation(field, possibleOperator);

  if (field.type === 'string' || field.type === 'boolean') {
    // suggest as series split
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: [possibleOperation, ...firstQuery.select],
        },
      },
    };
    const newVisModel = buildViewModel(
      extendedQueryState,
      [extendedQueryState.queries[firstQueryKey]!.select[2]],
      [extendedQueryState.queries[firstQueryKey]!.select[1]],
      [extendedQueryState.queries[firstQueryKey]!.select[0]]
    );

    return [
      buildSuggestion(
        newVisModel,
        {
          iconType: displayTypeIcon.line,
        },
        0.8
      ),
    ];
  }

  if (field.type === 'date') {
    // suggest as x axis, use current x axis as split
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: [firstQuery.select[1], firstQuery.select[0], possibleOperation],
        },
      },
    };
    const newVisModel = buildViewModel(
      extendedQueryState,
      [extendedQueryState.queries[firstQueryKey]!.select[2]],
      [extendedQueryState.queries[firstQueryKey]!.select[1]],
      [extendedQueryState.queries[firstQueryKey]!.select[0]]
    );

    return [
      buildSuggestion(
        updateXyState(newVisModel, { displayType: 'line' }),
        {
          iconType: displayTypeIcon.line,
        },
        0.8
      ),
    ];
  }

  if (field.type === 'number') {
    // suggest as y axis, TODO implement multiple y axes
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: [possibleOperation, firstQuery.select[1]],
        },
      },
    };
    const newVisModel = buildViewModel(
      extendedQueryState,
      [extendedQueryState.queries[firstQueryKey]!.select[1]],
      [extendedQueryState.queries[firstQueryKey]!.select[0]],
      []
    );

    return [
      buildSuggestion(
        newVisModel,
        {
          iconType: displayTypeIcon.line,
        },
        0.5
      ),
    ];
  }

  return [];
}

function WorkspacePanel({ children, ...props }: any) {
  return <DroppablePane {...props}>{children}</DroppablePane>;
}

function getSuggestionsForField(
  datasourceName: string,
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const operationNames = getOperatorsForField(field);
  const firstQuery = Object.values(visModel.queries)[0];

  if (operationNames.length === 0 || !field.aggregatable) {
    return [] as Suggestion[];
  }

  if (!firstQuery || firstQuery.select.length === 0) {
    return _getSuggestionsForFieldAsInitialState(field, visModel);
  }

  if (firstQuery && firstQuery.select.length === 1) {
    return _getSuggestionsForFieldAsXOrY(field, visModel);
  }

  if (firstQuery && firstQuery.select.length === 2) {
    return _getSuggestionsForFieldAsSplit(field, visModel);
  }

  return [];
}

export const config: EditorPlugin<XyChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: lnsConfigPanel,
  WorkspacePanel,
  getChartSuggestions: visModel => getSuggestion(visModel, 'line', 'Switch to line chart'),
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
