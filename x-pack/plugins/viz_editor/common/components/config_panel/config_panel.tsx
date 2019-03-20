/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { DateHistogramOperation, QueryColumn, SumOperation } from '../../lib';

// TODO: This will be part of the query AST helper library or whatever, and
// can probably be systematized better than this...
export const columnOperations: any = {
  date_histogram: {
    summarize(op: DateHistogramOperation) {
      return (
        <div className="configPanel-summary">
          <EuiIcon type="calendar" className="configPanel-summary-icon" />
          <div className="configPanel-summary-text">
            <strong className="configPanel-summary-title">Date histogram of</strong>
            <span className="configPanel-summary-subtitle">{op.arg.field}</span>
          </div>
        </div>
      );
    },
  },
  sum: {
    summarize(op: SumOperation) {
      return (
        <div className="configPanel-summary">
          <EuiIcon type="number" className="configPanel-summary-icon" />
          <div className="configPanel-summary-text">
            <strong className="configPanel-summary-title">Sum of</strong>
            <span className="configPanel-summary-subtitle">{op.arg}</span>
          </div>
        </div>
      );
    },
  },
};

// TODO: Make this not a total hack
export function columnSummary(column?: QueryColumn) {
  if (!column) {
    return <div>Column Not Found</div>;
  }

  const colOp = columnOperations[column.op];

  if (!colOp) {
    return <div>Unsupported operation {column.op}</div>;
  }

  return colOp.summarize(column);
}
