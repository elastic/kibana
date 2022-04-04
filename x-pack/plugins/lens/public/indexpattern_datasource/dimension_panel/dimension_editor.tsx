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
  EuiSpacer,
  EuiListGroupItemProps,
  EuiFormLabel,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import type { IndexPatternDimensionEditorProps } from './dimension_panel';
import type { OperationSupportMatrix } from './operation_support';
import type { GenericIndexPatternColumn } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  insertOrReplaceColumn,
  replaceColumn,
  updateColumnParam,
  updateDefaultLabels,
  resetIncomplete,
  FieldBasedIndexPatternColumn,
  canTransition,
  DEFAULT_TIME_SCALE,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField } from '../pure_utils';
import { fieldIsInvalid } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import type { IndexPattern, IndexPatternLayer } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';
import { ReferenceEditor } from './reference_editor';
import { setTimeScaling, TimeScaling } from './time_scaling';
import { defaultFilter, Filtering, setFilter } from './filtering';
import { AdvancedOptions } from './advanced_options';
import { setTimeShift, TimeShift } from './time_shift';
import type { LayerType } from '../../../common';
import {
  quickFunctionsName,
  staticValueOperationName,
  isQuickFunction,
  getParamEditor,
  formulaOperationName,
  DimensionEditorTabs,
  CalloutWarning,
  DimensionEditorTab,
} from './dimensions_editor_helpers';
import type { TemporaryState } from './dimensions_editor_helpers';
import { FieldInput } from './field_input';
import { NameInput } from '../../shared_components';
import { ParamEditorProps } from '../operations/definitions';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: GenericIndexPatternColumn;
  layerType: LayerType;
  operationSupportMatrix: OperationSupportMatrix;
  currentIndexPattern: IndexPattern;
}

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
    supportStaticValue,
    supportFieldFormat = true,
    layerType,
    paramEditorCustomProps,
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

  const [temporaryState, setTemporaryState] = useState<TemporaryState>('none');

  const temporaryQuickFunction = Boolean(temporaryState === quickFunctionsName);
  const temporaryStaticValue = Boolean(temporaryState === staticValueOperationName);

  const updateLayer = useCallback(
    (newLayer) => setState((prevState) => mergeLayer({ state: prevState, layerId, newLayer })),
    [layerId, setState]
  );

  const setStateWrapper = (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer),
    options: { forceRender?: boolean } = {}
  ) => {
    const hypotheticalLayer = typeof setter === 'function' ? setter(state.layers[layerId]) : setter;
    const isDimensionComplete = Boolean(hypotheticalLayer.columns[columnId]);
    setState(
      (prevState) => {
        const layer = typeof setter === 'function' ? setter(prevState.layers[layerId]) : setter;
        return mergeLayer({ state: prevState, layerId, newLayer: layer });
      },
      {
        isDimensionComplete,
        ...options,
      }
    );
  };

  const setIsCloseable = (isCloseable: boolean) => {
    setState((prevState) => ({ ...prevState, isDimensionClosePrevented: !isCloseable }));
  };

  const incompleteInfo = (state.layers[layerId].incompleteColumns ?? {})[columnId];
  const {
    operationType: incompleteOperation,
    sourceField: incompleteField = null,
    ...incompleteParams
  } = incompleteInfo || {};

  const isQuickFunctionSelected = Boolean(
    supportStaticValue
      ? selectedOperationDefinition && isQuickFunction(selectedOperationDefinition.type)
      : !selectedOperationDefinition || isQuickFunction(selectedOperationDefinition.type)
  );
  const showQuickFunctions = temporaryQuickFunction || isQuickFunctionSelected;

  const showStaticValueFunction =
    temporaryStaticValue ||
    (temporaryState === 'none' &&
      supportStaticValue &&
      (!selectedColumn || selectedColumn?.operationType === staticValueOperationName));

  const addStaticValueColumn = (prevLayer = props.state.layers[props.layerId]) => {
    if (selectedColumn?.operationType !== staticValueOperationName) {
      trackUiEvent(`indexpattern_dimension_operation_static_value`);
      const layer = insertOrReplaceColumn({
        layer: prevLayer,
        indexPattern: currentIndexPattern,
        columnId,
        op: staticValueOperationName,
        visualizationGroups: dimensionGroups,
      });
      const value = props.activeData?.[layerId]?.rows[0]?.[columnId];
      // replace the default value with the one from the active data
      if (value != null) {
        return updateDefaultLabels(
          updateColumnParam({
            layer,
            columnId,
            paramName: 'value',
            value: props.activeData?.[layerId]?.rows[0]?.[columnId],
          }),
          currentIndexPattern
        );
      }
      return layer;
    }
    return prevLayer;
  };

  // this function intercepts the state update for static value function
  // and. if in temporary state, it merges the "add new static value column" state with the incoming
  // changes from the static value operation (which has to be a function)
  // Note: it forced a rerender at this point to avoid UI glitches in async updates (another hack upstream)
  // TODO: revisit this once we get rid of updateDatasourceAsync upstream
  const moveDefinetelyToStaticValueAndUpdate = (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
  ) => {
    if (temporaryStaticValue) {
      setTemporaryState('none');
    }
    if (typeof setter === 'function') {
      return setState(
        (prevState) => {
          const layer = setter(addStaticValueColumn(prevState.layers[layerId]));
          return mergeLayer({ state: prevState, layerId, newLayer: layer });
        },
        {
          isDimensionComplete: true,
          forceRender: true,
        }
      );
    }
  };

  const ParamEditor = getParamEditor(
    temporaryStaticValue,
    selectedOperationDefinition,
    supportStaticValue && !showQuickFunctions
  );

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
  const operationsWithCompatibility = possibleOperations.map((operationType) => {
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
          state.layers[layerId],
          layerType
        ),
    };
  });

  const currentFieldIsInvalid = useMemo(
    () => fieldIsInvalid(selectedColumn, currentIndexPattern),
    [selectedColumn, currentIndexPattern]
  );

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
            ['none', 'fullReference', 'managedReference'].includes(
              operationDefinitionMap[operationType].input
            )
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
            if (
              temporaryQuickFunction &&
              isQuickFunction(newLayer.columns[columnId].operationType)
            ) {
              // Only switch the tab once the "non quick function" is fully removed
              setTemporaryState('none');
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
            }
            if (
              temporaryQuickFunction &&
              isQuickFunction(newLayer.columns[columnId].operationType)
            ) {
              // Only switch the tab once the "non quick function" is fully removed
              setTemporaryState('none');
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
            setTemporaryState('none');
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

  const shouldDisplayExtraOptions =
    !currentFieldIsInvalid &&
    !incompleteInfo &&
    selectedColumn &&
    isQuickFunction(selectedColumn.operationType) &&
    ParamEditor;

  const shouldDisplayReferenceEditor =
    !incompleteInfo &&
    selectedColumn &&
    'references' in selectedColumn &&
    selectedOperationDefinition?.input === 'fullReference';

  const shouldDisplayFieldInput =
    !selectedColumn ||
    selectedOperationDefinition?.input === 'field' ||
    (incompleteOperation && operationDefinitionMap[incompleteOperation]?.input === 'field') ||
    temporaryQuickFunction;

  const FieldInputComponent = selectedOperationDefinition?.renderFieldInput || FieldInput;

  const paramEditorProps: ParamEditorProps<GenericIndexPatternColumn> = {
    layer: state.layers[layerId],
    layerId,
    activeData: props.activeData,
    updateLayer: (setter) => {
      if (temporaryQuickFunction) {
        setTemporaryState('none');
      }
      setStateWrapper(setter, { forceRender: temporaryQuickFunction });
    },
    columnId,
    currentColumn: state.layers[layerId].columns[columnId],
    dateRange,
    indexPattern: currentIndexPattern,
    operationDefinitionMap,
    toggleFullscreen,
    isFullscreen,
    setIsCloseable,
    paramEditorCustomProps,
    ...services,
  };

  const quickFunctions = (
    <>
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormLabel>
          {i18n.translate('xpack.lens.indexPattern.functionsLabel', {
            defaultMessage: 'Functions',
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

      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
        {shouldDisplayReferenceEditor ? (
          <>
            {selectedColumn.references.map((referenceId, index) => {
              const validation = selectedOperationDefinition.requiredReferences[index];

              return (
                <ReferenceEditor
                  key={index}
                  layer={state.layers[layerId]}
                  layerId={layerId}
                  activeData={props.activeData}
                  columnId={referenceId}
                  updateLayer={(
                    setter:
                      | IndexPatternLayer
                      | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
                  ) => {
                    updateLayer(
                      typeof setter === 'function' ? setter(state.layers[layerId]) : setter
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
                  paramEditorCustomProps={paramEditorCustomProps}
                  {...services}
                />
              );
            })}
            {selectedOperationDefinition.selectionStyle !== 'field' ? <EuiSpacer size="s" /> : null}
          </>
        ) : null}

        {shouldDisplayFieldInput ? (
          <FieldInputComponent
            layer={state.layers[layerId]}
            selectedColumn={selectedColumn as FieldBasedIndexPatternColumn}
            columnId={columnId}
            indexPattern={currentIndexPattern}
            existingFields={state.existingFields}
            operationSupportMatrix={operationSupportMatrix}
            updateLayer={(newLayer) => {
              if (temporaryQuickFunction) {
                setTemporaryState('none');
              }
              setStateWrapper(newLayer, { forceRender: temporaryQuickFunction });
            }}
            incompleteField={incompleteField}
            incompleteOperation={incompleteOperation}
            incompleteParams={incompleteParams}
            currentFieldIsInvalid={currentFieldIsInvalid}
            helpMessage={selectedOperationDefinition?.getHelpMessage?.({
              data: props.data,
              uiSettings: props.uiSettings,
              currentColumn: state.layers[layerId].columns[columnId],
            })}
            dimensionGroups={dimensionGroups}
            groupId={props.groupId}
            operationDefinitionMap={operationDefinitionMap}
          />
        ) : null}

        {shouldDisplayExtraOptions && <ParamEditor {...paramEditorProps} />}
      </div>
    </>
  );

  const customParamEditor = ParamEditor ? (
    <>
      <ParamEditor
        layer={state.layers[layerId]}
        layerId={layerId}
        activeData={props.activeData}
        updateLayer={temporaryStaticValue ? moveDefinetelyToStaticValueAndUpdate : setStateWrapper}
        columnId={columnId}
        currentColumn={state.layers[layerId].columns[columnId]}
        dateRange={dateRange}
        indexPattern={currentIndexPattern}
        operationDefinitionMap={operationDefinitionMap}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        setIsCloseable={setIsCloseable}
        paramEditorCustomProps={paramEditorCustomProps}
        {...services}
      />
    </>
  ) : null;

  const TabContent = showQuickFunctions ? quickFunctions : customParamEditor;

  const onFormatChange = useCallback(
    (newFormat) => {
      updateLayer(
        updateColumnParam({
          layer: state.layers[layerId],
          columnId,
          paramName: 'format',
          value: newFormat,
        })
      );
    },
    [columnId, layerId, state.layers, updateLayer]
  );

  const hasFormula =
    !isFullscreen && operationSupportMatrix.operationWithoutField.has(formulaOperationName);

  const hasTabs = !isFullscreen && (hasFormula || supportStaticValue);

  const tabs: DimensionEditorTab[] = [
    {
      id: staticValueOperationName,
      enabled: Boolean(supportStaticValue),
      state: showStaticValueFunction,
      onClick: () => {
        if (selectedColumn?.operationType === formulaOperationName) {
          return setTemporaryState(staticValueOperationName);
        }
        setTemporaryState('none');
        setStateWrapper(addStaticValueColumn());
        return;
      },
      label: i18n.translate('xpack.lens.indexPattern.staticValueLabel', {
        defaultMessage: 'Static value',
      }),
    },
    {
      id: quickFunctionsName,
      enabled: true,
      state: showQuickFunctions,
      onClick: () => {
        if (selectedColumn && !isQuickFunction(selectedColumn.operationType)) {
          setTemporaryState(quickFunctionsName);
          return;
        }
      },
      label: i18n.translate('xpack.lens.indexPattern.quickFunctionsLabel', {
        defaultMessage: 'Quick functions',
      }),
    },
    {
      id: formulaOperationName,
      enabled: hasFormula,
      state: temporaryState === 'none' && selectedColumn?.operationType === formulaOperationName,
      onClick: () => {
        setTemporaryState('none');
        if (selectedColumn?.operationType !== formulaOperationName) {
          const newLayer = insertOrReplaceColumn({
            layer: props.state.layers[props.layerId],
            indexPattern: currentIndexPattern,
            columnId,
            op: formulaOperationName,
            visualizationGroups: dimensionGroups,
          });
          setStateWrapper(newLayer);
          trackUiEvent(`indexpattern_dimension_operation_formula`);
        }
      },
      label: i18n.translate('xpack.lens.indexPattern.formulaLabel', {
        defaultMessage: 'Formula',
      }),
    },
  ];

  const defaultLabel = useMemo(
    () =>
      String(
        selectedColumn &&
          operationDefinitionMap[selectedColumn.operationType].getDefaultLabel(
            selectedColumn,
            state.indexPatterns[state.layers[layerId].indexPatternId],
            state.layers[layerId].columns
          )
      ),
    [layerId, selectedColumn, state.indexPatterns, state.layers]
  );

  const shouldDisplayAdvancedOptions =
    !isFullscreen &&
    !currentFieldIsInvalid &&
    !incompleteInfo &&
    selectedColumn &&
    temporaryState === 'none' &&
    selectedOperationDefinition &&
    (selectedOperationDefinition.timeScalingMode ||
      selectedOperationDefinition.filterable ||
      selectedOperationDefinition.shiftable);

  return (
    <div id={columnId}>
      {hasTabs ? <DimensionEditorTabs tabs={tabs} /> : null}
      <CalloutWarning
        currentOperationType={selectedColumn?.operationType}
        temporaryStateType={temporaryState}
      />
      {TabContent}

      {shouldDisplayAdvancedOptions && (
        <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
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
                  selectedOperationDefinition.timeScalingMode &&
                    selectedOperationDefinition.timeScalingMode !== 'disabled' &&
                    Object.values(state.layers[layerId].columns).some(
                      (col) => col.operationType === 'date_histogram'
                    ) &&
                    !selectedColumn.timeScale
                ),
                inlineElement: selectedOperationDefinition.timeScalingMode ? (
                  <TimeScaling
                    selectedColumn={selectedColumn}
                    columnId={columnId}
                    layer={state.layers[layerId]}
                    updateLayer={setStateWrapper}
                  />
                ) : null,
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
                  selectedOperationDefinition.filterable && !selectedColumn.filter
                ),
                inlineElement:
                  selectedOperationDefinition.filterable && selectedColumn.filter ? (
                    <Filtering
                      indexPattern={currentIndexPattern}
                      selectedColumn={selectedColumn}
                      columnId={columnId}
                      layer={state.layers[layerId]}
                      updateLayer={setStateWrapper}
                      isInitiallyOpen={filterByOpenInitially}
                      helpMessage={
                        selectedOperationDefinition.filterable &&
                        typeof selectedOperationDefinition.filterable !== 'boolean'
                          ? selectedOperationDefinition.filterable.helpMessage
                          : null
                      }
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
                  selectedOperationDefinition.shiftable &&
                    selectedColumn.timeShift === undefined &&
                    (currentIndexPattern.timeFieldName ||
                      Object.values(state.layers[layerId].columns).some(
                        (col) => col.operationType === 'date_histogram'
                      ))
                ),
                inlineElement:
                  selectedOperationDefinition.shiftable &&
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
              ...(operationDefinitionMap[selectedColumn.operationType].getAdvancedOptions?.(
                paramEditorProps
              ) || []),
            ]}
          />
        </div>
      )}

      {!isFullscreen && !currentFieldIsInvalid && (
        <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded  lnsIndexPatternDimensionEditor__section--collapseNext">
          {!incompleteInfo && selectedColumn && temporaryState === 'none' && (
            <NameInput
              // re-render the input from scratch to obtain new "initial value" if the underlying default label changes
              key={defaultLabel}
              value={selectedColumn.label}
              defaultValue={defaultLabel}
              onChange={(value) => {
                updateLayer({
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
                });
              }}
            />
          )}

          {!isFullscreen && !incompleteInfo && !hideGrouping && temporaryState === 'none' && (
            <BucketNestingEditor
              layer={state.layers[props.layerId]}
              columnId={props.columnId}
              setColumns={(columnOrder) => updateLayer({ columnOrder })}
              getFieldByName={currentIndexPattern.getFieldByName}
            />
          )}

          {supportFieldFormat &&
          !isFullscreen &&
          selectedColumn &&
          (selectedColumn.dataType === 'number' || selectedColumn.operationType === 'range') ? (
            <FormatSelector selectedColumn={selectedColumn} onChange={onFormatChange} />
          ) : null}
        </div>
      )}
    </div>
  );
}
