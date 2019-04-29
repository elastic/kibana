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
  updateOperation,
  VisModel,
} from '../..';
import { DatasourceField } from '../../../common';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';
import { PieChartVisModel, removePrivateState } from './types';

export function SliceAxisEditor({
  operationId,
  visModel,
  onChangeVisModel,
  getSuggestions,
}: {
  operationId: string;
  visModel: PieChartVisModel;
  onChangeVisModel: (visModel: VisModel) => void;
  getSuggestions: any;
}) {
  const operation = selectOperation(operationId, visModel);

  if (!operation) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      operation={operation}
      visModel={visModel}
      onOperationChange={newOperation => {
        onChangeVisModel(updateOperation(operationId, newOperation, visModel));
      }}
      allowedScale="ordinal"
      allowedCardinality="multi"
      defaultOperator={() => 'terms'}
      canDrop={(f: DatasourceField) => f.type === 'string'}
      removable
      onOperationRemove={() => {
        const firstQueryKey = Object.keys(visModel.queries)[0];
        const sliceAxisOperation = selectOperation(
          visModel.private.pieChart.sliceAxis.columns[0],
          visModel
        );
        const extendedQueryState = removeOperation(
          `${firstQueryKey}_${sliceAxisOperation!.id}`,
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
