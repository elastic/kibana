/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import {
  ColumnOperation,
  DateHistogramOperation,
  SelectOperation,
  SelectOperator,
  SumOperation,
} from '../../../../common';

type ColumnOperations = {
  [operation in SelectOperator]: {
    summarize: (op: any) => JSX.Element;
  }
};

// TODO: This will be part of the query AST helper library or whatever, and
// can probably be systematized better than this...
export const columnOperations: ColumnOperations = {
  date_histogram: {
    summarize(op: DateHistogramOperation) {
      return (
        <span>
          <EuiIcon type="calendar" className="configPanel-summary-icon" />
          {` Date histogram of ${op.argument.field}`}
        </span>
      );
    },
  },
  sum: {
    summarize(op: SumOperation) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Sum of ${op.argument.field}`}
        </span>
      );
    },
  },
  cardinality: {
    summarize(op) {
      return (
        <div className="configPanel-summary">
          <EuiIcon type="string" className="configPanel-summary-icon" />
          <div className="configPanel-summary-text">
            <strong className="configPanel-summary-title">Unique Values of</strong>
            <span className="configPanel-summary-subtitle">{op.argument.field}</span>
          </div>
        </div>
      );
    },
  },
  count: {
    summarize(op) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Count`}
        </span>
      );
    },
  },
  column: {
    summarize(op: ColumnOperation) {
      return (
        <span>
          <EuiIcon type="string" className="configPanel-summary-icon" />
          {` ${op.argument.field}`}
        </span>
      );
    },
  },
  avg: {
    summarize(op) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Average of ${op.argument.field}`}
        </span>
      );
    },
  },
  terms: {
    summarize(op) {
      return (
        <span>
          <EuiIcon type="string" className="configPanel-summary-icon" />
          {` Unique values of ${op.argument.field}`}
        </span>
      );
    },
  },
};

// TODO: Make this not a total hack
export function columnSummary(column?: SelectOperation) {
  if (!column) {
    return <div>Column Not Found</div>;
  }

  const colOp = columnOperations[column.operation];

  if (!colOp) {
    return <div>Unsupported operation {column.operation}</div>;
  }

  return colOp.summarize(column);
}
