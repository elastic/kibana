/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { removeColumn, selectColumn, updateColumn, VisModel } from '../..';
import { DatasourceField } from '../../../common';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

export function SeriesAxisEditor({
  col,
  visModel,
  onChangeVisModel,
}: {
  col: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const column = selectColumn(col, visModel);

  if (!column) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      column={column}
      visModel={visModel}
      onColumnChange={newColumn => {
        onChangeVisModel(updateColumn(col, newColumn, visModel));
      }}
      allowedScale="ordinal"
      allowedCardinality="multi"
      defaultOperator={field => (field.type === 'date' ? 'date_histogram' : 'terms')}
      removable
      onColumnRemove={() => {
        // TODO there should be a helper function for that
        const updatedModel: VisModel = {
          ...removeColumn(col, visModel),
          private: {
            ...visModel.private,
            xyChart: {
              ...visModel.private.xyChart,
              seriesAxis: {
                ...visModel.private.xyChart.seriesAxis,
                columns: visModel.private.xyChart.seriesAxis.columns.filter(
                  (currentCol: any) => currentCol !== col
                ),
              },
            },
          },
        };
        onChangeVisModel(updatedModel);
      }}
      canDrop={(f: DatasourceField) => f.type === 'string' || f.type === 'date'}
    >
      {getOperationSummary(column)}
    </OperationEditor>
  );
}
