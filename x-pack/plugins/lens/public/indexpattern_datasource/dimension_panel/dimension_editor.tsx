/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React, { useState, useMemo, useCallback } from 'react';
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
  EuiTabs,
  EuiTab,
  EuiCallOut,
} from '@elastic/eui';
import { IndexPatternDimensionEditorProps } from './dimension_panel';
import { OperationSupportMatrix } from './operation_support';
import { IndexPatternColumn } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  insertOrReplaceColumn,
  replaceColumn,
  updateColumnParam,
  resetIncomplete,
  FieldBasedIndexPatternColumn,
  canTransition,
  DEFAULT_TIME_SCALE,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField, fieldIsInvalid } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternLayer } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';
import { ReferenceEditor } from './reference_editor';
import { setTimeScaling, TimeScaling } from './time_scaling';
import { defaultFilter, Filtering, setFilter } from './filtering';
import { AdvancedOptions } from './advanced_options';
import { setTimeShift, TimeShift } from './time_shift';
import { useDebouncedValue } from '../../shared_components';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: IndexPatternColumn;
  operationSupportMatrix: OperationSupportMatrix;
  currentIndexPattern: IndexPattern;
}

const LabelInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { inputValue, handleInputChange, initialValue } = useDebouncedValue({ onChange, value });

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
        onChange={(e) => {
          handleInputChange(e.target.value);
        }}
        placeholder={initialValue}
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
    dimensionGroups,
    toggleFullscreen,
    isFullscreen,
  } = props;
  const services = {
    data: props.data,
    uiSettings: props.uiSettings,
    savedObjectsClient: props.savedObjectsClient,
    http: props.http,
    storage: props.storage,
  };
  const { fieldByOperation, operationWithoutField } = operationSupportMatrix;

  const selectedOperationDefinition =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType];

  const setStateWrapper = (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
  ) => {
    const prevOperationType =
      operationDefinitionMap[state.layers[layerId].columns[columnId]?.operationType]?.input;

    const hypotheticalLayer = typeof setter === 'function' ? setter(state.layers[layerId]) : setter;
    const hasIncompleteColumns = Boolean(hypotheticalLayer.incompleteColumns?.[columnId]);
    setState(
      (prevState) => {
        const layer = typeof setter === 'function' ? setter(prevState.layers[layerId]) : setter;
        return mergeLayer({ state: prevState, layerId, newLayer: layer });
      },
      {
        isDimensionComplete:
          prevOperationType === 'fullReference'
            ? !hasIncompleteColumns
            : Boolean(hypotheticalLayer.columns[columnId]),
      }
    );
  };

  const setIsCloseable = (isCloseable: boolean) => {
    setState((prevState) => ({ ...prevState, isDimensionClosePrevented: !isCloseable }));
  };

  const incompleteInfo = (state.layers[layerId].incompleteColumns ?? {})[columnId];
  const incompleteOperation = incompleteInfo?.operationType;
  const incompleteField = incompleteInfo?.sourceField ?? null;

  const ParamEditor = selectedOperationDefinition?.paramEditor;

  const [temporaryQuickFunction, setQuickFunction] = useState(false);

  const possibleOperations = useMemo(() => {
    return Object.values(operationDefinitionMap)
      .filter(({ hidden }) => !hidden)
      .filter(
        (operationDefinition) =>
          !('selectionStyle' in operationDefinition) ||
          operationDefinition.selectionStyle !== 'hidden'
      )
      .filter(({ type }) => fieldByOperation[type]?.size || operationWithoutField.has(type))
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .map((def) => def.type);
  }, [fieldByOperation, operationWithoutField]);

  const [filterByOpenInitially, setFilterByOpenInitally] = useState(false);
  const [timeShiftedFocused, setTimeShiftFocused] = useState(false);

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
        visualizationGroups: dimensionGroups,
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
            operationDefinitionMap[operationType].input === 'managedReference' ||
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
              visualizationGroups: dimensionGroups,
              targetGroup: props.groupId,
            });
            if (temporaryQuickFunction && newLayer.columns[columnId].operationType !== 'formula') {
              // Only switch the tab once the formula is fully removed
              setQuickFunction(false);
            }
            setStateWrapper(newLayer);
            trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
            return;
          } else if (!selectedColumn || !compatibleWithCurrentField) {
            const possibleFields = fieldByOperation[operationType] || new Set();

            let newLayer: IndexPatternLayer;
            if (possibleFields.size === 1) {
              newLayer = insertOrReplaceColumn({
                layer: props.state.layers[props.layerId],
                indexPattern: currentIndexPattern,
                columnId,
                op: operationType,
                field: currentIndexPattern.getFieldByName(possibleFields.values().next().value),
                visualizationGroups: dimensionGroups,
                targetGroup: props.groupId,
              });
            } else {
              newLayer = insertOrReplaceColumn({
                layer: props.state.layers[props.layerId],
                indexPattern: currentIndexPattern,
                columnId,
                op: operationType,
                field: undefined,
                visualizationGroups: dimensionGroups,
                targetGroup: props.groupId,
              });
              // );
            }
            if (temporaryQuickFunction && newLayer.columns[columnId].operationType !== 'formula') {
              // Only switch the tab once the formula is fully removed
              setQuickFunction(false);
            }
            setStateWrapper(newLayer);
            trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
            return;
          }

          if (selectedColumn.operationType === operationType) {
            if (incompleteInfo) {
              setStateWrapper(resetIncomplete(state.layers[layerId], columnId));
            }
            return;
          }

          if (temporaryQuickFunction) {
            setQuickFunction(false);
          }
          const newLayer = replaceColumn({
            layer: props.state.layers[props.layerId],
            indexPattern: currentIndexPattern,
            columnId,
            op: operationType,
            field: hasField(selectedColumn)
              ? currentIndexPattern.getFieldByName(selectedColumn.sourceField)
              : undefined,
            visualizationGroups: dimensionGroups,
          });
          setStateWrapper(newLayer);
        },
      };
    }
  );

  // Need to workout early on the error to decide whether to show this or an help text
  const fieldErrorMessage =
    ((selectedOperationDefinition?.input !== 'fullReference' &&
      selectedOperationDefinition?.input !== 'managedReference') ||
      (incompleteOperation && operationDefinitionMap[incompleteOperation].input === 'field')) &&
    getErrorMessage(
      selectedColumn,
      Boolean(incompleteOperation),
      selectedOperationDefinition?.input,
      currentFieldIsInvalid
    );

  const shouldDisplayExtraOptions =
    !currentFieldIsInvalid &&
    !incompleteInfo &&
    selectedColumn &&
    selectedColumn.operationType !== 'formula';

  const quickFunctions = (
    <>
      {temporaryQuickFunction && selectedColumn?.operationType === 'formula' && (
        <>
          <EuiCallOut
            className="lnsIndexPatternDimensionEditor__warning"
            size="s"
            title={i18n.translate('xpack.lens.indexPattern.formulaWarning', {
              defaultMessage: 'Formula currently applied',
            })}
            iconType="alert"
            color="warning"
          >
            <p>
              {i18n.translate('xpack.lens.indexPattern.formulaWarningText', {
                defaultMessage: 'To overwrite your formula, select a quick function',
              })}
            </p>
          </EuiCallOut>
        </>
      )}
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
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
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
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
                  updateLayer={(
                    setter:
                      | IndexPatternLayer
                      | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
                  ) => {
                    setState(
                      mergeLayer({
                        state,
                        layerId,
                        newLayer:
                          typeof setter === 'function' ? setter(state.layers[layerId]) : setter,
                      })
                    );
                  }}
                  validation={validation}
                  currentIndexPattern={currentIndexPattern}
                  existingFields={state.existingFields}
                  selectionStyle={selectedOperationDefinition.selectionStyle}
                  dateRange={dateRange}
                  labelAppend={selectedOperationDefinition?.getHelpMessage?.({
                    data: props.data,
                    uiSettings: props.uiSettings,
                    currentColumn: state.layers[layerId].columns[columnId],
                  })}
                  dimensionGroups={dimensionGroups}
                  isFullscreen={isFullscreen}
                  toggleFullscreen={toggleFullscreen}
                  setIsCloseable={setIsCloseable}
                  {...services}
                />
              );
            })}
            <EuiSpacer size="s" />
          </>
        ) : null}

        {!selectedColumn ||
        selectedOperationDefinition?.input === 'field' ||
        (incompleteOperation && operationDefinitionMap[incompleteOperation].input === 'field') ||
        temporaryQuickFunction ? (
          <EuiFormRow
            data-test-subj="indexPattern-field-selection-row"
            label={i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Select a field',
            })}
            fullWidth
            isInvalid={Boolean(incompleteOperation || currentFieldIsInvalid)}
            error={fieldErrorMessage}
            labelAppend={
              !fieldErrorMessage &&
              selectedOperationDefinition?.getHelpMessage?.({
                data: props.data,
                uiSettings: props.uiSettings,
                currentColumn: state.layers[layerId].columns[columnId],
              })
            }
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
              onChoose={(choice) => {
                setStateWrapper(
                  insertOrReplaceColumn({
                    layer: state.layers[layerId],
                    columnId,
                    indexPattern: currentIndexPattern,
                    op: choice.operationType,
                    field: currentIndexPattern.getFieldByName(choice.field),
                    visualizationGroups: dimensionGroups,
                    targetGroup: props.groupId,
                  })
                );
              }}
            />
          </EuiFormRow>
        ) : null}

        {shouldDisplayExtraOptions && ParamEditor && (
          <ParamEditor
            layer={state.layers[layerId]}
            updateLayer={setStateWrapper}
            columnId={columnId}
            currentColumn={state.layers[layerId].columns[columnId]}
            dateRange={dateRange}
            indexPattern={currentIndexPattern}
            operationDefinitionMap={operationDefinitionMap}
            toggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            setIsCloseable={setIsCloseable}
            {...services}
          />
        )}

        {!currentFieldIsInvalid && !incompleteInfo && selectedColumn && (
          <AdvancedOptions
            options={[
              {
                title: i18n.translate('xpack.lens.indexPattern.timeScale.enableTimeScale', {
                  defaultMessage: 'Normalize by unit',
                }),
                dataTestSubj: 'indexPattern-time-scaling-enable',
                onClick: () => {
                  setStateWrapper(
                    setTimeScaling(columnId, state.layers[layerId], DEFAULT_TIME_SCALE)
                  );
                },
                showInPopover: Boolean(
                  operationDefinitionMap[selectedColumn.operationType].timeScalingMode &&
                    operationDefinitionMap[selectedColumn.operationType].timeScalingMode !==
                      'disabled' &&
                    Object.values(state.layers[layerId].columns).some(
                      (col) => col.operationType === 'date_histogram'
                    ) &&
                    !selectedColumn.timeScale
                ),
                inlineElement: (
                  <TimeScaling
                    selectedColumn={selectedColumn}
                    columnId={columnId}
                    layer={state.layers[layerId]}
                    updateLayer={setStateWrapper}
                  />
                ),
              },
              {
                title: i18n.translate('xpack.lens.indexPattern.filterBy.label', {
                  defaultMessage: 'Filter by',
                }),
                dataTestSubj: 'indexPattern-filter-by-enable',
                onClick: () => {
                  setFilterByOpenInitally(true);
                  setStateWrapper(setFilter(columnId, state.layers[layerId], defaultFilter));
                },
                showInPopover: Boolean(
                  operationDefinitionMap[selectedColumn.operationType].filterable &&
                    !selectedColumn.filter
                ),
                inlineElement:
                  operationDefinitionMap[selectedColumn.operationType].filterable &&
                  selectedColumn.filter ? (
                    <Filtering
                      indexPattern={currentIndexPattern}
                      selectedColumn={selectedColumn}
                      columnId={columnId}
                      layer={state.layers[layerId]}
                      updateLayer={setStateWrapper}
                      isInitiallyOpen={filterByOpenInitially}
                    />
                  ) : null,
              },
              {
                title: i18n.translate('xpack.lens.indexPattern.timeShift.label', {
                  defaultMessage: 'Time shift',
                }),
                dataTestSubj: 'indexPattern-time-shift-enable',
                onClick: () => {
                  setTimeShiftFocused(true);
                  setStateWrapper(setTimeShift(columnId, state.layers[layerId], ''));
                },
                showInPopover: Boolean(
                  operationDefinitionMap[selectedColumn.operationType].shiftable &&
                    selectedColumn.timeShift === undefined &&
                    (currentIndexPattern.timeFieldName ||
                      Object.values(state.layers[layerId].columns).some(
                        (col) => col.operationType === 'date_histogram'
                      ))
                ),
                inlineElement:
                  operationDefinitionMap[selectedColumn.operationType].shiftable &&
                  selectedColumn.timeShift !== undefined ? (
                    <TimeShift
                      indexPattern={currentIndexPattern}
                      selectedColumn={selectedColumn}
                      columnId={columnId}
                      layer={state.layers[layerId]}
                      updateLayer={setStateWrapper}
                      isFocused={timeShiftedFocused}
                      activeData={props.activeData}
                      layerId={layerId}
                    />
                  ) : null,
              },
            ]}
          />
        )}
      </div>

      <EuiSpacer size="s" />
    </>
  );

  const formulaTab = ParamEditor ? (
    <ParamEditor
      layer={state.layers[layerId]}
      updateLayer={setStateWrapper}
      columnId={columnId}
      currentColumn={state.layers[layerId].columns[columnId]}
      dateRange={dateRange}
      indexPattern={currentIndexPattern}
      operationDefinitionMap={operationDefinitionMap}
      toggleFullscreen={toggleFullscreen}
      isFullscreen={isFullscreen}
      setIsCloseable={setIsCloseable}
      {...services}
    />
  ) : null;

  const onFormatChange = useCallback(
    (newFormat) => {
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
    },
    [columnId, layerId, setState, state]
  );

  return (
    <div id={columnId}>
      {!isFullscreen && operationSupportMatrix.operationWithoutField.has('formula') ? (
        <EuiTabs size="s" className="lnsIndexPatternDimensionEditor__header">
          <EuiTab
            isSelected={temporaryQuickFunction || selectedColumn?.operationType !== 'formula'}
            data-test-subj="lens-dimensionTabs-quickFunctions"
            onClick={() => {
              if (selectedColumn?.operationType === 'formula') {
                setQuickFunction(true);
              }
            }}
          >
            {i18n.translate('xpack.lens.indexPattern.quickFunctionsLabel', {
              defaultMessage: 'Quick functions',
            })}
          </EuiTab>
          <EuiTab
            isSelected={!temporaryQuickFunction && selectedColumn?.operationType === 'formula'}
            data-test-subj="lens-dimensionTabs-formula"
            onClick={() => {
              if (selectedColumn?.operationType !== 'formula') {
                setQuickFunction(false);
                const newLayer = insertOrReplaceColumn({
                  layer: props.state.layers[props.layerId],
                  indexPattern: currentIndexPattern,
                  columnId,
                  op: 'formula',
                  visualizationGroups: dimensionGroups,
                });
                setStateWrapper(newLayer);
                trackUiEvent(`indexpattern_dimension_operation_formula`);
                return;
              } else {
                setQuickFunction(false);
              }
            }}
          >
            {i18n.translate('xpack.lens.indexPattern.formulaLabel', {
              defaultMessage: 'Formula',
            })}
          </EuiTab>
        </EuiTabs>
      ) : null}

      {isFullscreen
        ? formulaTab
        : selectedOperationDefinition?.type === 'formula' && !temporaryQuickFunction
        ? formulaTab
        : quickFunctions}

      {!isFullscreen && !currentFieldIsInvalid && !temporaryQuickFunction && (
        <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded">
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
                          customLabel:
                            operationDefinitionMap[selectedColumn.operationType].getDefaultLabel(
                              selectedColumn,
                              state.indexPatterns[state.layers[layerId].indexPatternId],
                              state.layers[layerId].columns
                            ) !== value,
                        },
                      },
                    },
                  })
                );
              }}
            />
          )}

          {!isFullscreen && !incompleteInfo && !hideGrouping && (
            <BucketNestingEditor
              layer={state.layers[props.layerId]}
              columnId={props.columnId}
              setColumns={(columnOrder) =>
                setState(mergeLayer({ state, layerId, newLayer: { columnOrder } }))
              }
              getFieldByName={currentIndexPattern.getFieldByName}
            />
          )}

          {!isFullscreen &&
          selectedColumn &&
          (selectedColumn.dataType === 'number' || selectedColumn.operationType === 'range') ? (
            <FormatSelector selectedColumn={selectedColumn} onChange={onFormatChange} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function getErrorMessage(
  selectedColumn: IndexPatternColumn | undefined,
  incompleteOperation: boolean,
  input: 'none' | 'field' | 'fullReference' | 'managedReference' | undefined,
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
