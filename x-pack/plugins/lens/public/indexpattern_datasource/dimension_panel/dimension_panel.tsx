/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import {
  DatasourceDimensionTriggerProps,
  DatasourceDimensionEditorProps,
  DatasourceDimensionDropProps,
  DatasourceDimensionDropHandlerProps,
} from '../../types';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { getAvailableOperationsByMetadata, buildColumn, changeField } from '../operations';
import { PopoverEditor } from './popover_editor';
import { changeColumn } from '../state_helpers';
import { isDraggedField, hasField } from '../utils';
import { IndexPatternPrivateState, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { DateRange } from '../../../common';

export type IndexPatternDimensionTriggerProps = DatasourceDimensionTriggerProps<
  IndexPatternPrivateState
> & {
  uniqueLabel: string;
};

export type IndexPatternDimensionEditorProps = DatasourceDimensionEditorProps<
  IndexPatternPrivateState
> & {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  layerId: string;
  http: HttpSetup;
  data: DataPublicPluginStart;
  uniqueLabel: string;
  dateRange: DateRange;
};

export interface OperationFieldSupportMatrix {
  operationByField: Partial<Record<string, OperationType[]>>;
  fieldByOperation: Partial<Record<OperationType, string[]>>;
}

type Props = Pick<
  DatasourceDimensionDropProps<IndexPatternPrivateState>,
  'layerId' | 'columnId' | 'state' | 'filterOperations'
>;

// TODO: This code has historically been memoized, as a potentially performance
// sensitive task. If we can add memoization without breaking the behavior, we should.
const getOperationFieldSupportMatrix = (props: Props): OperationFieldSupportMatrix => {
  const layerId = props.layerId;
  const currentIndexPattern = props.state.indexPatterns[props.state.layers[layerId].indexPatternId];

  const filteredOperationsByMetadata = getAvailableOperationsByMetadata(
    currentIndexPattern
  ).filter((operation) => props.filterOperations(operation.operationMetaData));

  const supportedOperationsByField: Partial<Record<string, OperationType[]>> = {};
  const supportedFieldsByOperation: Partial<Record<OperationType, string[]>> = {};

  filteredOperationsByMetadata.forEach(({ operations }) => {
    operations.forEach((operation) => {
      if (supportedOperationsByField[operation.field]) {
        supportedOperationsByField[operation.field]!.push(operation.operationType);
      } else {
        supportedOperationsByField[operation.field] = [operation.operationType];
      }

      if (supportedFieldsByOperation[operation.operationType]) {
        supportedFieldsByOperation[operation.operationType]!.push(operation.field);
      } else {
        supportedFieldsByOperation[operation.operationType] = [operation.field];
      }
    });
  });
  return {
    operationByField: _.mapValues(supportedOperationsByField, _.uniq),
    fieldByOperation: _.mapValues(supportedFieldsByOperation, _.uniq),
  };
};

export function canHandleDrop(props: DatasourceDimensionDropProps<IndexPatternPrivateState>) {
  const operationFieldSupportMatrix = getOperationFieldSupportMatrix(props);

  const { dragging } = props.dragDropContext;
  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationFieldSupportMatrix.operationByField[field.name]);
  }

  return (
    isDraggedField(dragging) &&
    layerIndexPatternId === dragging.indexPatternId &&
    Boolean(hasOperationForField(dragging.field))
  );
}

export function onDrop(
  props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>
): boolean {
  const operationFieldSupportMatrix = getOperationFieldSupportMatrix(props);
  const droppedItem = props.droppedItem;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationFieldSupportMatrix.operationByField[field.name]);
  }

  if (!isDraggedField(droppedItem) || !hasOperationForField(droppedItem.field)) {
    // TODO: What do we do if we couldn't find a column?
    return false;
  }

  const operationsForNewField =
    operationFieldSupportMatrix.operationByField[droppedItem.field.name];

  const layerId = props.layerId;
  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;
  const currentIndexPattern =
    props.state.indexPatterns[props.state.layers[layerId]?.indexPatternId];

  // We need to check if dragging in a new field, was just a field change on the same
  // index pattern and on the same operations (therefore checking if the new field supports
  // our previous operation)
  const hasFieldChanged =
    selectedColumn &&
    hasField(selectedColumn) &&
    selectedColumn.sourceField !== droppedItem.field.name &&
    operationsForNewField &&
    operationsForNewField.includes(selectedColumn.operationType);

  if (!operationsForNewField || operationsForNewField.length === 0) {
    return false;
  }

  // If only the field has changed use the onFieldChange method on the operation to get the
  // new column, otherwise use the regular buildColumn to get a new column.
  const newColumn = hasFieldChanged
    ? changeField(selectedColumn, currentIndexPattern, droppedItem.field)
    : buildColumn({
        op: operationsForNewField[0],
        columns: props.state.layers[props.layerId].columns,
        indexPattern: currentIndexPattern,
        layerId,
        suggestedPriority: props.suggestedPriority,
        field: droppedItem.field,
        previousColumn: selectedColumn,
      });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(props.state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');

  props.setState(
    changeColumn({
      state: props.state,
      layerId,
      columnId: props.columnId,
      newColumn,
      // If the field has changed, the onFieldChange method needs to take care of everything including moving
      // over params. If we create a new column above we want changeColumn to move over params.
      keepParams: !hasFieldChanged,
    })
  );

  return true;
}

export const IndexPatternDimensionTriggerComponent = function IndexPatternDimensionTrigger(
  props: IndexPatternDimensionTriggerProps
) {
  const layerId = props.layerId;

  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;

  const { columnId, uniqueLabel } = props;
  if (!selectedColumn) {
    return null;
  }
  return (
    <EuiLink
      id={columnId}
      className="lnsLayerPanel__triggerLink"
      onClick={() => {
        props.togglePopover();
      }}
      data-test-subj="lns-dimensionTrigger"
      aria-label={i18n.translate('xpack.lens.configure.editConfig', {
        defaultMessage: 'Edit configuration',
      })}
      title={i18n.translate('xpack.lens.configure.editConfig', {
        defaultMessage: 'Edit configuration',
      })}
    >
      {uniqueLabel}
    </EuiLink>
  );
};

export const IndexPatternDimensionEditorComponent = function IndexPatternDimensionPanel(
  props: IndexPatternDimensionEditorProps
) {
  const layerId = props.layerId;
  const currentIndexPattern =
    props.state.indexPatterns[props.state.layers[layerId]?.indexPatternId];
  const operationFieldSupportMatrix = getOperationFieldSupportMatrix(props);

  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;

  return (
    <PopoverEditor
      {...props}
      currentIndexPattern={currentIndexPattern}
      selectedColumn={selectedColumn}
      operationFieldSupportMatrix={operationFieldSupportMatrix}
    />
  );
};

export const IndexPatternDimensionTrigger = memo(IndexPatternDimensionTriggerComponent);
export const IndexPatternDimensionEditor = memo(IndexPatternDimensionEditorComponent);
