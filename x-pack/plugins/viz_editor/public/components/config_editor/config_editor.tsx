/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import {
  DateHistogramOperation,
  QueryColumn,
  selectColumn,
  SumOperation,
  ViewModel,
} from '../../lib';

// TODO: Move this into a visualization registry feature
interface Visualization {
  ConfigEditor: (props: ViewModel) => JSX.Element;
}

interface VisualizationRegistry {
  [key: string]: Visualization;
}

// TODO: This will be part of the query AST helper library or whatever, and
// can probably be systematized better than this...
const columnOperations: any = {
  date_histogram: {
    summarize(op: DateHistogramOperation) {
      return (
        <div className="configEditor-summary">
          <EuiIcon type="calendar" className="configEditor-summary-icon" />
          <div className="configEditor-summary-text">
            <strong className="configEditor-summary-title">Date histogram of</strong>
            <span className="configEditor-summary-subtitle">{op.arg.field}</span>
          </div>
        </div>
      );
    },
  },
  sum: {
    summarize(op: SumOperation) {
      return (
        <div className="configEditor-summary">
          <EuiIcon type="number" className="configEditor-summary-icon" />
          <div className="configEditor-summary-text">
            <strong className="configEditor-summary-title">Sum of</strong>
            <span className="configEditor-summary-subtitle">{op.arg}</span>
          </div>
        </div>
      );
    },
  },
};

// TODO: Make this not a total hack
function columnSummary(column?: QueryColumn) {
  if (!column) {
    return <div>Column Not Found</div>;
  }

  const colOp = columnOperations[column.op];

  if (!colOp) {
    return <div>Unsupported operation {column.op}</div>;
  }

  return colOp.summarize(column);
}

// TODO: This will be a pluggable registry or whatnot
const visualizationsRegistry: VisualizationRegistry = {
  bar_chart: {
    ConfigEditor(props: ViewModel) {
      return (
        <>
          <div className="configEditor-axis">
            <span className="configEditor-axis-title">Y-axis</span>
            {props.yAxis.columns.map(col => (
              <span>{columnSummary(selectColumn(col, props))}</span>
            ))}
          </div>
          <div className="configEditor-axis">
            <span className="configEditor-axis-title">X-axis</span>
            {props.xAxis.columns.map(col => (
              <span>{columnSummary(selectColumn(col, props))}</span>
            ))}
          </div>
        </>
      );
    },
  },
};

export function ConfigEditor(props: ViewModel) {
  const { visualizationType } = props;
  const visualizationDefinition = visualizationsRegistry[visualizationType];

  if (!visualizationDefinition) {
    return <div>Visualization Not Found {visualizationType}</div>;
  }

  return (
    <div className="configEditor">
      <visualizationDefinition.ConfigEditor {...props} />
    </div>
  );
}
