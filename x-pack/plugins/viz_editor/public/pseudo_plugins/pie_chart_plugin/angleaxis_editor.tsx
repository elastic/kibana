/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  getTopSuggestion,
  removeOperation,
  selectOperation,
  Suggestion,
  updateOperation,
  VisModel,
} from '../..';
import { DatasourceField } from '../../../common';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';
import { PieChartVisModel, removePrivateState } from './types';

export function AngleAxisEditor({
  operationId: col,
  visModel,
  onChangeVisModel,
  getSuggestions,
}: {
  operationId: string;
  visModel: PieChartVisModel;
  onChangeVisModel: (visModel: VisModel) => void;
  getSuggestions: (visModel: VisModel) => Suggestion[];
}) {
  const operation = selectOperation(col, visModel);

  if (!operation) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      operation={operation}
      visModel={visModel}
      onOperationChange={newColumn => {
        onChangeVisModel(updateOperation(col, newColumn, visModel));
      }}
      allowedScale="interval"
      allowedCardinality="single"
      defaultOperator={() => 'sum'}
      canDrop={(f: DatasourceField) => f && f.type === 'number'}
      removable
      onOperationRemove={() => {
        const firstQueryKey = Object.keys(visModel.queries)[0];
        const angleAxisOperation = selectOperation(
          visModel.private.pieChart.angleAxis.columns[0],
          visModel
        );
        const extendedQueryState = removeOperation(
          `${firstQueryKey}_${angleAxisOperation!.id}`,
          visModel
        );
        const suggestion = getTopSuggestion(getSuggestions(extendedQueryState));

        onChangeVisModel({
          ...removePrivateState(suggestion.visModel),
          editorPlugin: suggestion.pluginName,
        });
      }}
    >
      {getOperationSummary(operation)}
    </OperationEditor>
  );
}
