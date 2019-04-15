/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField } from '../../../common';
import {
  getTopSuggestion,
  removeOperation,
  selectOperation,
  Suggestion,
  updateOperation,
  VisModel,
} from '../../../public';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';
import { removePrivateState } from './state_helpers';

export function YAxisEditor({
  operationId,
  visModel,
  onChangeVisModel,
  getSuggestions,
}: {
  operationId: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
  getSuggestions: (visModel: VisModel) => Suggestion[];
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
      allowedScale="interval"
      allowedCardinality="single"
      defaultOperator={() => 'sum'}
      canDrop={(f: DatasourceField) => f && f.type === 'number'}
      removable
      onOperationRemove={() => {
        const firstQueryKey = Object.keys(visModel.queries)[0];
        const yAxisOperation = selectOperation(visModel.private.xyChart.yAxis.columns[0], visModel);
        const extendedQueryState = removeOperation(
          `${firstQueryKey}_${yAxisOperation!.id}`,
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
