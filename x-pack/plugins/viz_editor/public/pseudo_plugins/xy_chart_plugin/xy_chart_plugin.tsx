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
} from '@elastic/eui';
import React from 'react';
import {
  DatasourceField,
  fieldToOperation,
  SelectOperation,
  SelectOperator,
} from '../../../common';
import {
  EditorPlugin,
  getOperatorsForField,
  isApplicableForCardinality,
  operationToName,
  Suggestion,
  UnknownVisModel,
  VisualizationPanelProps,
} from '../../../public';
import { SeriesAxisEditor } from './seriesaxis_editor';
import { prefillPrivateState, updateXyState } from './state_helpers';
import { PLUGIN_NAME, XyChartVisModel, XyDisplayType } from './types';
import { XAxisEditor } from './xaxis_editor';
import { YAxisEditor } from './yaxis_editor';

function configPanel({
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

  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Display type</span>
        <EuiSuperSelect
          options={[
            {
              value: 'line',
              inputDisplay: 'Line',
            },
            {
              value: 'area',
              inputDisplay: 'Area',
            },
            {
              value: 'bar',
              inputDisplay: 'Bar',
            },
          ]}
          valueOfSelected={displayType || 'line'}
          onChange={(value: XyDisplayType) => {
            const updatedVisModel = updateXyState(visModel, { displayType: value });
            onChangeVisModel(updatedVisModel);
          }}
        />
      </div>
      <div className="configPanel-axis">
        <EuiSwitch
          label="Stacked"
          checked={stacked}
          onChange={() => {
            onChangeVisModel(updateXyState(visModel, { stacked: !stacked }));
          }}
        />
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Y-axis</span>
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
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Split series by</span>
        {seriesAxis.columns.map(col => (
          <SeriesAxisEditor
            key={col}
            operationId={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
          />
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
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
};

function buildSuggestion(
  visModel: XyChartVisModel,
  options?: {
    title?: string;
    iconType?: IconType;
  }
) {
  const title = [visModel.private.xyChart.yAxis.title, visModel.private.xyChart.xAxis.title].join(
    ' over '
  );

  return {
    title,
    visModel,
    previewExpression: toExpression(visModel, 'preview'),
    score: 0.7,
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

function _getSuggestionsForFieldAsReplacement(
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const { datasource } = visModel;

  if (!datasource) {
    return [];
  }

  let suggestions = [] as Array<Suggestion | null>;

  const opToSuggestion = (op: SelectOperator): Suggestion | null => {
    let xAxis = [];
    let yAxis = [];

    if (op === 'count') {
      return null;
    }

    xAxis = [fieldToOperation('x', field, op)];
    yAxis = [fieldToOperation('y', field, 'count')];

    const newVisModel = buildViewModel(visModel, xAxis, yAxis, []);

    return buildSuggestion(newVisModel, {
      iconType: displayTypeIcon.line,
    });
  };

  const opWithDateHistogram = (op: SelectOperator): Suggestion | null => {
    let xAxis = [];
    let yAxis = [];
    let seriesAxis: SelectOperation[] = [];

    if (op === 'column') {
      xAxis = [
        fieldToOperation(
          'x',
          datasource.fields.find(f => f.name === datasource.timeFieldName)!,
          'column'
        ),
      ];
      yAxis = [fieldToOperation('y', field, op)];
    } else {
      xAxis = [
        fieldToOperation(
          'x',
          datasource.fields.find(f => f.name === datasource.timeFieldName)!,
          'date_histogram'
        ),
      ];

      if (op === 'count') {
        return null;
      } else {
        seriesAxis = [fieldToOperation('series', field, op)];
        yAxis = [fieldToOperation('y', field, 'count')];
      }
    }

    const newVisModel = buildViewModel(visModel, xAxis, yAxis, seriesAxis);

    return buildSuggestion(newVisModel, {
      iconType: displayTypeIcon.line,
    });
  };

  if (datasource!.timeFieldName && datasource!.timeFieldName !== field.name) {
    if (field.type === 'number') {
      suggestions = suggestions.concat(opWithDateHistogram('column'));
    } else {
      suggestions = suggestions.concat(
        getOperatorsForField(field).map(op => opWithDateHistogram(op))
      );
    }
  }

  suggestions = suggestions.concat(getOperatorsForField(field).map(opToSuggestion));

  return suggestions.filter(suggestion => !!suggestion) as Suggestion[];
}

function getSuggestionsForField(
  datasourceName: string,
  field: DatasourceField,
  visModel: XyChartVisModel
): Suggestion[] {
  const operationNames = getOperatorsForField(field);

  if (operationNames.length === 0 || !field.aggregatable) {
    return [] as Suggestion[];
  }

  return _getSuggestionsForFieldAsReplacement(field, visModel);
}

export const config: EditorPlugin<XyChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions: visModel => getSuggestion(visModel, 'line', 'Switch to line chart'),
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
