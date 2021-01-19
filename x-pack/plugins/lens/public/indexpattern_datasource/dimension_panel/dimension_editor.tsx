/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './dimension_editor.scss';
import _ from 'lodash';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiListGroup,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiListGroupItemProps,
  EuiFormLabel,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { IndexPatternDimensionEditorProps } from './dimension_panel';
import { OperationSupportMatrix } from './operation_support';
import { IndexPatternColumn } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  insertOrReplaceColumn,
  replaceColumn,
  deleteColumn,
  updateColumnParam,
  resetIncomplete,
  FieldBasedIndexPatternColumn,
  canTransition,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField, fieldIsInvalid } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternLayer } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';
import { ReferenceEditor } from './reference_editor';
import { TimeScaling } from './time_scaling';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: IndexPatternColumn;
  operationSupportMatrix: OperationSupportMatrix;
  currentIndexPattern: IndexPattern;
}

/**
 * This component shows a debounced input for the label of a dimension. It will update on root state changes
 * if no debounced changes are in flight because the user is currently typing into the input.
 */
const LabelInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [inputValue, setInputValue] = useState(value);
  const unflushedChanges = useRef(false);

  const onChangeDebounced = useMemo(() => {
    const callback = _.debounce((val: string) => {
      onChange(val);
      unflushedChanges.current = false;
    }, 256);
    return (val: string) => {
      unflushedChanges.current = true;
      callback(val);
    };
  }, [onChange]);

  useEffect(() => {
    if (!unflushedChanges.current && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value);
    setInputValue(val);
    onChangeDebounced(val);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
        defaultMessage: 'Display name',
        description: 'Display name of a column of data',
      })}
      display="columnCompressed"
      fullWidth
    >
      <EuiFieldText
        compressed
        data-test-subj="indexPattern-label-edit"
        value={inputValue}
        onChange={handleInputChange}
      />
    </EuiFormRow>
  );
};

export function DimensionEditor(props: DimensionEditorProps) {
  const {
    selectedColumn,
    operationSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
    hideGrouping,
    dateRange,
  } = props;
  const services = {
    data: props.data,
    uiSettings: props.uiSettings,
    savedObjectsClient: props.savedObjectsClient,
    http: props.http,
    storage: props.storage,
  };
  const { fieldByOperation, operationWithoutField } = operationSupportMatrix;

  const setStateWrapper = (layer: IndexPatternLayer) => {
    const hasIncompleteColumns = Boolean(layer.incompleteColumns?.[columnId]);
    const prevOperationType =
      operationDefinitionMap[state.layers[layerId].columns[columnId]?.operationType]?.input;
    setState(mergeLayer({ state, layerId, newLayer: layer }), {
      shouldReplaceDimension: Boolean(layer.columns[columnId]),
      // clear the dimension if there's an incomplete column pending && previous operation was a fullReference operation
      shouldRemoveDimension: Boolean(hasIncompleteColumns && prevOperationType === 'fullReference'),
    });
  };

  const selectedOperationDefinition =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType];

  const incompleteInfo = (state.layers[layerId].incompleteColumns ?? {})[columnId];
  const incompleteOperation = incompleteInfo?.operationType;
  const incompleteField = incompleteInfo?.sourceField ?? null;

  const ParamEditor = selectedOperationDefinition?.paramEditor;

  const possibleOperations = useMemo(() => {
    return Object.values(operationDefinitionMap)
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .map((def) => def.type)
      .filter((type) => fieldByOperation[type]?.size || operationWithoutField.has(type));
  }, [fieldByOperation, operationWithoutField]);

  // Operations are compatible if they match inputs. They are always compatible in
  // the empty state. Field-based operations are not compatible with field-less operations.
  const operationsWithCompatibility = [...possibleOperations].map((operationType) => {
    const definition = operationDefinitionMap[operationType];

    const currentField =
      selectedColumn &&
      hasField(selectedColumn) &&
      currentIndexPattern.getFieldByName(selectedColumn.sourceField);
    return {
      operationType,
      compatibleWithCurrentField: canTransition({
        layer: state.layers[layerId],
        columnId,
        op: operationType,
        indexPattern: currentIndexPattern,
        field: currentField || undefined,
        filterOperations: props.filterOperations,
      }),
      disabledStatus:
        definition.getDisabledStatus &&
        definition.getDisabledStatus(
          state.indexPatterns[state.currentIndexPatternId],
          state.layers[layerId]
        ),
    };
  });

  const currentFieldIsInvalid = useMemo(() => fieldIsInvalid(selectedColumn, currentIndexPattern), [
    selectedColumn,
    currentIndexPattern,
  ]);

  const sideNavItems: EuiListGroupItemProps[] = operationsWithCompatibility.map(
    ({ operationType, compatibleWithCurrentField, disabledStatus }) => {
      const isActive = Boolean(
        incompleteOperation === operationType ||
          (!incompleteOperation && selectedColumn && selectedColumn.operationType === operationType)
      );

      let color: EuiListGroupItemProps['color'] = 'primary';
      if (isActive) {
        color = 'text';
      } else if (!compatibleWithCurrentField) {
        color = 'subdued';
      }

      let label: EuiListGroupItemProps['label'] = operationPanels[operationType].displayName;
      if (isActive && disabledStatus) {
        label = (
          <EuiToolTip content={disabledStatus} display="block" position="left">
            <EuiText color="danger" size="s">
              <strong>{operationPanels[operationType].displayName}</strong>
            </EuiText>
          </EuiToolTip>
        );
      } else if (disabledStatus) {
        label = (
          <EuiToolTip content={disabledStatus} display="block" position="left">
            <span>{operationPanels[operationType].displayName}</span>
          </EuiToolTip>
        );
      } else if (isActive) {
        label = <strong>{operationPanels[operationType].displayName}</strong>;
      }

      return {
        id: operationType as string,
        label,
        color,
        isActive,
        size: 's',
        isDisabled: !!disabledStatus,
        className: 'lnsIndexPatternDimensionEditor__operation',
        'data-test-subj': `lns-indexPatternDimension-${operationType}${
          compatibleWithCurrentField ? '' : ' incompatible'
        }`,
        [`aria-pressed`]: isActive,
        onClick() {
          if (
            operationDefinitionMap[operationType].input === 'none' ||
            operationDefinitionMap[operationType].input === 'fullReference'
          ) {
            // Clear invalid state because we are reseting to a valid column
            if (selectedColumn?.operationType === operationType) {
              if (incompleteInfo) {
                setStateWrapper(resetIncomplete(state.layers[layerId], columnId));
              }
              return;
            }
            const newLayer = insertOrReplaceColumn({
              layer: props.state.layers[props.layerId],
              indexPattern: currentIndexPattern,
              columnId,
              op: operationType,
            });
            setStateWrapper(newLayer);
            trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
            return;
          } else if (!selectedColumn || !compatibleWithCurrentField) {
            const possibleFields = fieldByOperation[operationType] || new Set();

            if (possibleFields.size === 1) {
              setStateWrapper(
                insertOrReplaceColumn({
                  layer: props.state.layers[props.layerId],
                  indexPattern: currentIndexPattern,
                  columnId,
                  op: operationType,
                  field: currentIndexPattern.getFieldByName(possibleFields.values().next().value),
                })
              );
            } else {
              setStateWrapper(
                insertOrReplaceColumn({
                  layer: props.state.layers[props.layerId],
                  indexPattern: currentIndexPattern,
                  columnId,
                  op: operationType,
                  field: undefined,
                })
              );
            }
            trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
            return;
          }

          if (selectedColumn.operationType === operationType) {
            if (incompleteInfo) {
              setStateWrapper(resetIncomplete(state.layers[layerId], columnId));
            }
            return;
          }

          const newLayer = replaceColumn({
            layer: props.state.layers[props.layerId],
            indexPattern: currentIndexPattern,
            columnId,
            op: operationType,
            field: hasField(selectedColumn)
              ? currentIndexPattern.getFieldByName(selectedColumn.sourceField)
              : undefined,
          });
          setStateWrapper(newLayer);
        },
      };
    }
  );

  return (
    <div id={columnId}>
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormLabel>
          {i18n.translate('xpack.lens.indexPattern.functionsLabel', {
            defaultMessage: 'Select a function',
          })}
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiListGroup
          className={sideNavItems.length > 3 ? 'lnsIndexPatternDimensionEditor__columns' : ''}
          gutterSize="none"
          listItems={
            // add a padding item containing a non breakable space if the number of operations is not even
            // otherwise the column layout will break within an element
            sideNavItems.length % 2 === 1 ? [...sideNavItems, { label: '\u00a0' }] : sideNavItems
          }
          maxWidth={false}
        />
      </div>
      <EuiSpacer size="s" />
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        {!incompleteInfo &&
        selectedColumn &&
        'references' in selectedColumn &&
        selectedOperationDefinition?.input === 'fullReference' ? (
          <>
            {selectedColumn.references.map((referenceId, index) => {
              const validation = selectedOperationDefinition.requiredReferences[index];

              return (
                <ReferenceEditor
                  key={index}
                  layer={state.layers[layerId]}
                  columnId={referenceId}
                  updateLayer={(newLayer: IndexPatternLayer) => {
                    setState(mergeLayer({ state, layerId, newLayer }));
                  }}
                  validation={validation}
                  currentIndexPattern={currentIndexPattern}
                  existingFields={state.existingFields}
                  selectionStyle={selectedOperationDefinition.selectionStyle}
                  dateRange={dateRange}
                  {...services}
                />
              );
            })}
            <EuiSpacer size="s" />
          </>
        ) : null}

        {!selectedColumn ||
        selectedOperationDefinition?.input === 'field' ||
        (incompleteOperation && operationDefinitionMap[incompleteOperation].input === 'field') ? (
          <EuiFormRow
            data-test-subj="indexPattern-field-selection-row"
            label={i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Select a field',
            })}
            fullWidth
            isInvalid={Boolean(incompleteOperation || currentFieldIsInvalid)}
            error={getErrorMessage(
              selectedColumn,
              Boolean(incompleteOperation),
              selectedOperationDefinition?.input,
              currentFieldIsInvalid
            )}
          >
            <FieldSelect
              fieldIsInvalid={currentFieldIsInvalid}
              currentIndexPattern={currentIndexPattern}
              existingFields={state.existingFields}
              operationSupportMatrix={operationSupportMatrix}
              selectedOperationType={
                // Allows operation to be selected before creating a valid column
                selectedColumn ? selectedColumn.operationType : incompleteOperation
              }
              selectedField={
                // Allows field to be selected
                incompleteField
                  ? incompleteField
                  : (selectedColumn as FieldBasedIndexPatternColumn)?.sourceField
              }
              incompleteOperation={incompleteOperation}
              onDeleteColumn={() => {
                setStateWrapper(
                  deleteColumn({
                    layer: state.layers[layerId],
                    columnId,
                    indexPattern: currentIndexPattern,
                  })
                );
              }}
              onChoose={(choice) => {
                setStateWrapper(
                  insertOrReplaceColumn({
                    layer: state.layers[layerId],
                    columnId,
                    indexPattern: currentIndexPattern,
                    op: choice.operationType,
                    field: currentIndexPattern.getFieldByName(choice.field),
                  })
                );
              }}
            />
          </EuiFormRow>
        ) : null}

        {!currentFieldIsInvalid && !incompleteInfo && selectedColumn && ParamEditor && (
          <>
            <ParamEditor
              layer={state.layers[layerId]}
              updateLayer={setStateWrapper}
              columnId={columnId}
              currentColumn={state.layers[layerId].columns[columnId]}
              dateRange={dateRange}
              indexPattern={currentIndexPattern}
              {...services}
            />
          </>
        )}

        {!currentFieldIsInvalid && !incompleteInfo && selectedColumn && (
          <TimeScaling
            selectedColumn={selectedColumn}
            columnId={columnId}
            layer={state.layers[layerId]}
            updateLayer={setStateWrapper}
          />
        )}
      </div>

      <EuiSpacer size="s" />

      {!currentFieldIsInvalid && (
        <div className="lnsIndexPatternDimensionEditor__section">
          {!incompleteInfo && selectedColumn && (
            <LabelInput
              value={selectedColumn.label}
              onChange={(value) => {
                setState(
                  mergeLayer({
                    state,
                    layerId,
                    newLayer: {
                      columns: {
                        ...state.layers[layerId].columns,
                        [columnId]: {
                          ...selectedColumn,
                          label: value,
                          customLabel: true,
                        },
                      },
                    },
                  })
                );
              }}
            />
          )}

          {!incompleteInfo && !hideGrouping && (
            <BucketNestingEditor
              layer={state.layers[props.layerId]}
              columnId={props.columnId}
              setColumns={(columnOrder) =>
                setState(mergeLayer({ state, layerId, newLayer: { columnOrder } }))
              }
              getFieldByName={currentIndexPattern.getFieldByName}
            />
          )}

          {selectedColumn &&
          (selectedColumn.dataType === 'number' || selectedColumn.operationType === 'range') ? (
            <FormatSelector
              selectedColumn={selectedColumn}
              onChange={(newFormat) => {
                setState(
                  mergeLayer({
                    state,
                    layerId,
                    newLayer: updateColumnParam({
                      layer: state.layers[layerId],
                      columnId,
                      paramName: 'format',
                      value: newFormat,
                    }),
                  })
                );
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
function getErrorMessage(
  selectedColumn: IndexPatternColumn | undefined,
  incompleteOperation: boolean,
  input: 'none' | 'field' | 'fullReference' | undefined,
  fieldInvalid: boolean
) {
  if (selectedColumn && incompleteOperation) {
    if (input === 'field') {
      return i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
        defaultMessage: 'To use this function, select a different field.',
      });
    }
    return i18n.translate('xpack.lens.indexPattern.chooseFieldLabel', {
      defaultMessage: 'To use this function, select a field.',
    });
  }
  if (fieldInvalid) {
    return i18n.translate('xpack.lens.indexPattern.invalidFieldLabel', {
      defaultMessage: 'Invalid field. Check your index pattern or pick another field.',
    });
  }
}
