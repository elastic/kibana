/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiListGroup,
  EuiFormRow,
  EuiSpacer,
  EuiListGroupItemProps,
  EuiToolTip,
  EuiText,
  EuiIconTip,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiPanel,
  EuiBasicTable,
  EuiButtonIcon,
} from '@elastic/eui';
import ReactDOM from 'react-dom';
import { NameInput } from '@kbn/visualization-ui-components';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
import type { OperationSupportMatrix } from './operation_support';
import { deleteColumn, GenericIndexPatternColumn } from '../form_based';
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
  adjustColumnReferencesForChangedColumn,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { getReferencedField, hasField } from '../pure_utils';
import { fieldIsInvalid, getSamplingValue, isSamplingValueEnabled } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import type { FormBasedLayer } from '../types';
import { FormatSelector } from './format_selector';
import { ReferenceEditor } from './reference_editor';
import { TimeScaling } from './time_scaling';
import { Filtering } from './filtering';
import { ReducedTimeRange } from './reduced_time_range';
import { AdvancedOptions } from './advanced_options';
import { TimeShift } from './time_shift';
import type { LayerType } from '../../../../common/types';
import { DOCUMENT_FIELD_NAME } from '../../../../common/constants';
import {
  quickFunctionsName,
  staticValueOperationName,
  isQuickFunction,
  getParamEditor,
  formulaOperationName,
  DimensionEditorButtonGroups,
  CalloutWarning,
  DimensionEditorGroupsOptions,
  isLayerChangingDueToDecimalsPercentile,
  isLayerChangingDueToOtherBucketChange,
} from './dimensions_editor_helpers';
import type { TemporaryState } from './dimensions_editor_helpers';
import { FieldInput } from './field_input';
import { ParamEditorProps } from '../operations/definitions';
import { WrappingHelpPopover } from '../help_popover';
import { isColumn } from '../operations/definitions/helpers';
import type { FieldChoiceWithOperationType } from './field_select';
import type { IndexPattern, IndexPatternField } from '../../../types';
import { documentField } from '../document_field';

export interface DimensionEditorProps extends FormBasedDimensionEditorProps {
  selectedColumn?: GenericIndexPatternColumn;
  layerType: LayerType;
  operationSupportMatrix: OperationSupportMatrix;
  currentIndexPattern: IndexPattern;
}

const operationDisplay = getOperationDisplay();

function getHelpMessage(flag?: boolean | { helpMessage: string }) {
  return flag && typeof flag !== 'boolean' ? flag.helpMessage : null;
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
    enableFormatSelector = true,
    layerType,
    paramEditorCustomProps,
  } = props;
  const services = {
    data: props.data,
    fieldFormats: props.fieldFormats,
    uiSettings: props.uiSettings,
    http: props.http,
    storage: props.storage,
    unifiedSearch: props.unifiedSearch,
    dataViews: props.dataViews,
  };
  const { fieldByOperation, operationWithoutField } = operationSupportMatrix;

  const selectedOperationDefinition =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType];

  const [temporaryState, setTemporaryState] = useState<TemporaryState>('none');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // If a layer has sampling disabled, assume the toast has already fired in the past
  const [hasRandomSamplingToastFired, setSamplingToastAsFired] = useState(
    !isSamplingValueEnabled(state.layers[layerId])
  );

  const [hasRankingToastFired, setRankingToastAsFired] = useState(false);

  const [hasOtherBucketToastFired, setHasOtherBucketToastFired] = useState(false);

  const onHelpClick = () => setIsHelpOpen((prevIsHelpOpen) => !prevIsHelpOpen);
  const closeHelp = () => setIsHelpOpen(false);

  const temporaryQuickFunction = Boolean(temporaryState === quickFunctionsName);
  const temporaryStaticValue = Boolean(temporaryState === staticValueOperationName);
  const { euiTheme } = useEuiTheme();

  const updateLayer = useCallback(
    (newLayer) => setState((prevState) => mergeLayer({ state: prevState, layerId, newLayer })),
    [layerId, setState]
  );

  const fireOrResetOtherBucketToast = useCallback(
    (newLayer: FormBasedLayer) => {
      if (isLayerChangingDueToOtherBucketChange(state.layers[layerId], newLayer)) {
        props.notifications.toasts.add({
          title: i18n.translate('xpack.lens.uiInfo.otherBucketChangeTitle', {
            defaultMessage: '“Group remaining values as Other” disabled',
          }),
          text: i18n.translate('xpack.lens.uiInfo.otherBucketDisabled', {
            defaultMessage:
              'Values >= 1000 may slow performance. Re-enable the setting in “Advanced” options.',
          }),
        });
      }
      // resets the flag
      setHasOtherBucketToastFired(!hasOtherBucketToastFired);
    },
    [layerId, props.notifications.toasts, state.layers, hasOtherBucketToastFired]
  );

  const fireOrResetRandomSamplingToast = useCallback(
    (newLayer: FormBasedLayer) => {
      // if prev and current sampling state is different, show a toast to the user
      if (isSamplingValueEnabled(state.layers[layerId]) && !isSamplingValueEnabled(newLayer)) {
        if (newLayer.sampling != null && newLayer.sampling < 1) {
          props.notifications.toasts.add({
            title: i18n.translate('xpack.lens.uiInfo.samplingDisabledTitle', {
              defaultMessage: 'Layer sampling changed to 100%',
            }),
            text: i18n.translate('xpack.lens.uiInfo.samplingDisabledMessage', {
              defaultMessage:
                'The use of a maximum or minimum function on a layer requires all documents to be sampled in order to function properly.',
            }),
          });
        }
      }
      // reset the flag if the user switches to another supported operation
      setSamplingToastAsFired(!hasRandomSamplingToastFired);
    },
    [hasRandomSamplingToastFired, layerId, props.notifications.toasts, state.layers]
  );

  const fireOrResetRankingToast = useCallback(
    (newLayer: FormBasedLayer) => {
      if (isLayerChangingDueToDecimalsPercentile(state.layers[layerId], newLayer)) {
        props.notifications.toasts.add({
          title: i18n.translate('xpack.lens.uiInfo.rankingResetTitle', {
            defaultMessage: 'Ranking changed to alphabetical',
          }),
          text: i18n.translate('xpack.lens.uiInfo.rankingResetToAlphabetical', {
            defaultMessage: 'To rank by percentile, use whole numbers only.',
          }),
        });
      }
      // reset the flag if the user switches to another supported operation
      setRankingToastAsFired(!hasRankingToastFired);
    },
    [hasRankingToastFired, layerId, props.notifications.toasts, state.layers]
  );

  const fireOrResetToastChecks = useCallback(
    (newLayer: FormBasedLayer) => {
      fireOrResetRandomSamplingToast(newLayer);
      fireOrResetRankingToast(newLayer);
      fireOrResetOtherBucketToast(newLayer);
    },
    [fireOrResetRandomSamplingToast, fireOrResetRankingToast, fireOrResetOtherBucketToast]
  );

  const setStateWrapper = useCallback(
    (
      setter:
        | FormBasedLayer
        | ((prevLayer: FormBasedLayer) => FormBasedLayer)
        | GenericIndexPatternColumn,
      options: { forceRender?: boolean } = {}
    ) => {
      const layer = state.layers[layerId];
      let hypotethicalLayer: FormBasedLayer;
      if (isColumn(setter)) {
        hypotethicalLayer = {
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: setter,
          },
        };
      } else {
        hypotethicalLayer = typeof setter === 'function' ? setter(state.layers[layerId]) : setter;
      }
      const isDimensionComplete = Boolean(hypotethicalLayer.columns[columnId]);

      setState(
        (prevState) => {
          let outputLayer: FormBasedLayer;
          const prevLayer = prevState.layers[layerId];
          if (isColumn(setter)) {
            outputLayer = {
              ...prevLayer,
              columns: {
                ...prevLayer.columns,
                [columnId]: setter,
              },
            };
          } else {
            outputLayer = typeof setter === 'function' ? setter(prevState.layers[layerId]) : setter;
          }
          const newLayer = adjustColumnReferencesForChangedColumn(outputLayer, columnId);
          // Fire an info toast (eventually) on layer update
          fireOrResetToastChecks(newLayer);

          return mergeLayer({
            state: prevState,
            layerId,
            newLayer,
          });
        },
        {
          isDimensionComplete,
          ...options,
        }
      );
    },
    [columnId, fireOrResetToastChecks, layerId, setState, state.layers]
  );

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
  const moveDefinitelyToStaticValueAndUpdate = (
    setter:
      | FormBasedLayer
      | ((prevLayer: FormBasedLayer) => FormBasedLayer)
      | GenericIndexPatternColumn
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
    if (isColumn(setter)) {
      throw new Error('static value should only be updated by the whole layer');
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
      .filter(({ type }) => fieldByOperation.get(type)?.size || operationWithoutField.has(type))
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .map((def) => def.type);
  }, [fieldByOperation, operationWithoutField]);

  const helpPopoverContainer = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    return () => {
      if (helpPopoverContainer.current) {
        ReactDOM.unmountComponentAtNode(helpPopoverContainer.current);
        document.body.removeChild(helpPopoverContainer.current);
      }
    };
  }, []);

  const currentField =
    selectedColumn &&
    hasField(selectedColumn) &&
    currentIndexPattern.getFieldByName(selectedColumn.sourceField);

  const referencedField =
    currentField || getReferencedField(selectedColumn, currentIndexPattern, state.layers[layerId]);

  // Operations are compatible if they match inputs. They are always compatible in
  // the empty state. Field-based operations are not compatible with field-less operations.
  const operationsWithCompatibility = possibleOperations.map((operationType) => {
    const definition = operationDefinitionMap[operationType];

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
        dateRange,
      }),
      disabledStatus:
        definition.getDisabledStatus &&
        definition.getDisabledStatus(
          props.indexPatterns[state.currentIndexPatternId],
          state.layers[layerId],
          layerType
        ),
      compatibleWithSampling:
        getSamplingValue(state.layers[layerId]) === 1 ||
        (definition.getUnsupportedSettings?.()?.sampling ?? true),
    };
  });

  const currentFieldIsInvalid = useMemo(
    () => fieldIsInvalid(state.layers[layerId], columnId, currentIndexPattern),
    [state.layers, layerId, columnId, currentIndexPattern]
  );

  const shouldDisplayDots =
    temporaryState === 'none' ||
    (selectedColumn?.operationType != null && isQuickFunction(selectedColumn?.operationType));

  const sideNavItems: EuiListGroupItemProps[] = operationsWithCompatibility.map(
    ({ operationType, compatibleWithCurrentField, disabledStatus, compatibleWithSampling }) => {
      const isActive = Boolean(
        incompleteOperation === operationType ||
          (!incompleteOperation && selectedColumn && selectedColumn.operationType === operationType)
      );

      const partialIcon = compatibleWithCurrentField &&
        referencedField?.partiallyApplicableFunctions?.[operationType] && (
          <span data-test-subj={`${operationType}-partial-warning`}>
            {' '}
            <EuiIconTip
              content={i18n.translate(
                'xpack.lens.indexPattern.helpPartiallyApplicableFunctionLabel',
                {
                  defaultMessage:
                    'This function may only return partial results, as it is unable to support the full time range of rolled-up historical data.',
                }
              )}
              position="left"
              size="s"
              type="partial"
              color="warning"
            />
          </span>
        );
      let label: EuiListGroupItemProps['label'] = (
        <>
          {operationDisplay[operationType].displayName}
          {partialIcon}
        </>
      );
      if (isActive && disabledStatus) {
        label = (
          <EuiToolTip content={disabledStatus} display="block" position="left">
            <EuiText color="danger" size="s">
              <strong>{label}</strong>
            </EuiText>
          </EuiToolTip>
        );
      } else if (disabledStatus) {
        label = (
          <EuiToolTip content={disabledStatus} display="block" position="left">
            <span>{operationDisplay[operationType].displayName}</span>
          </EuiToolTip>
        );
      } else if (!compatibleWithCurrentField) {
        label = (
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} style={{ marginRight: euiTheme.size.xs, minWidth: 0 }}>
              <span
                css={css`
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {label}
              </span>
            </EuiFlexItem>
            {shouldDisplayDots && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.lens.indexPattern.helpIncompatibleFieldDotLabel', {
                    defaultMessage:
                      'This function is not compatible with the current selected field',
                  })}
                  position="left"
                  size="s"
                  type="dot"
                  color="warning"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      } else if (!compatibleWithSampling) {
        label = (
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} style={{ marginRight: euiTheme.size.xs }}>
              {label}
            </EuiFlexItem>
            {shouldDisplayDots && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.lens.indexPattern.settingsSamplingUnsupported', {
                    defaultMessage: `Selecting this function will change this layer's sampling to 100% in order to function properly.`,
                  })}
                  size="s"
                  type="dot"
                  color="warning"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      }

      return {
        id: operationType as string,
        label,
        isActive,
        size: 's',
        isDisabled: !!disabledStatus,
        className: 'lnsIndexPatternDimensionEditor__operation',
        'data-test-subj': `lns-indexPatternDimension-${operationType}${
          compatibleWithCurrentField ? '' : ' incompatible'
        }`,
        [`aria-pressed`]: isActive,
        extraAction: operationDefinitionMap[operationType].helpComponent
          ? {
              color: 'primary',
              onClick: (e) => {
                if (!helpPopoverContainer.current) {
                  const container = document.createElement('div');
                  helpPopoverContainer.current = container;
                  document.body.appendChild(container);
                  const HelpComponent = operationDefinitionMap[operationType].helpComponent!;
                  const element = (
                    <WrappingHelpPopover
                      button={e.target as HTMLElement}
                      isOpen={true}
                      title={operationDefinitionMap[operationType].helpComponentTitle}
                      closePopover={() => {
                        if (helpPopoverContainer.current) {
                          ReactDOM.unmountComponentAtNode(helpPopoverContainer.current);
                          document.body.removeChild(helpPopoverContainer.current);
                          helpPopoverContainer.current = null;
                        }
                      }}
                      theme={props.core.theme}
                    >
                      <HelpComponent />
                    </WrappingHelpPopover>
                  );
                  ReactDOM.render(element, helpPopoverContainer.current);
                } else {
                  ReactDOM.unmountComponentAtNode(helpPopoverContainer.current);
                  document.body.removeChild(helpPopoverContainer.current);
                  helpPopoverContainer.current = null;
                }
              },
              iconType: 'documentation',
              iconSize: 's',
              'aria-label': i18n.translate('xpack.lens.indexPattern.helpLabel', {
                defaultMessage: 'Function help',
              }),
            }
          : undefined,
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
            return;
          } else if (!selectedColumn || !compatibleWithCurrentField) {
            const possibleFields = fieldByOperation.get(operationType) ?? new Set<string>();

            let newLayer: FormBasedLayer;
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
                // if document field can be used, default to it
                field: possibleFields.has(DOCUMENT_FIELD_NAME) ? documentField : undefined,
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

  const paramEditorProps: ParamEditorProps<
    GenericIndexPatternColumn,
    FormBasedLayer | ((prevLayer: FormBasedLayer) => FormBasedLayer) | GenericIndexPatternColumn
  > = {
    layer: state.layers[layerId],
    layerId,
    activeData: props.activeData,
    paramEditorUpdater: (setter) => {
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
    paramEditorCustomProps,
    ReferenceEditor,
    dataSectionExtra: props.dataSectionExtra,
    ...services,
  };

  const helpButton = (
    <EuiButtonIcon
      onClick={onHelpClick}
      iconType="documentation"
      aria-label={i18n.translate('xpack.lens.indexPattern.quickFunctions.tableTitle', {
        defaultMessage: 'Description of functions',
      })}
    />
  );

  const columnsSidebar = [
    {
      field: 'function',
      name: i18n.translate('xpack.lens.indexPattern.functionTable.functionHeader', {
        defaultMessage: 'Function',
      }),
      width: '150px',
    },
    {
      field: 'description',
      name: i18n.translate('xpack.lens.indexPattern.functionTable.descriptionHeader', {
        defaultMessage: 'Description',
      }),
    },
  ];

  const items = sideNavItems
    .filter((item) => operationDefinitionMap[item.id!].quickFunctionDocumentation)
    .map((item) => {
      const operationDefinition = operationDefinitionMap[item.id!]!;
      return {
        id: item.id!,
        function: operationDefinition.displayName,
        description: operationDefinition.quickFunctionDocumentation!,
      };
    });

  const quickFunctions = (
    <>
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.lens.indexPattern.functionsLabel', {
                defaultMessage: 'Functions',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                anchorPosition="rightUp"
                button={helpButton}
                isOpen={isHelpOpen}
                display="inlineBlock"
                panelPaddingSize="none"
                closePopover={closeHelp}
                initialFocus="#functionsHelpBasicTableId"
              >
                <EuiPopoverTitle paddingSize="s">
                  {i18n.translate('xpack.lens.indexPattern.quickFunctions.popoverTitle', {
                    defaultMessage: 'Quick functions',
                  })}
                </EuiPopoverTitle>
                <EuiPanel
                  className="eui-yScroll"
                  style={{ maxHeight: '40vh' }}
                  color="transparent"
                  paddingSize="s"
                >
                  <EuiBasicTable
                    id="functionsHelpBasicTableId"
                    style={{ width: 350 }}
                    tableCaption={i18n.translate(
                      'xpack.lens.indexPattern.quickFunctions.tableTitle',
                      {
                        defaultMessage: 'Description of functions',
                      }
                    )}
                    items={items}
                    compressed={true}
                    rowHeader="firstName"
                    columns={columnsSidebar}
                    responsiveBreakpoint={false}
                  />
                </EuiPanel>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        fullWidth
      >
        <EuiListGroup
          className={sideNavItems.length > 3 ? 'lnsIndexPatternDimensionEditor__columns' : ''}
          gutterSize="none"
          color="primary"
          listItems={
            // add a padding item containing a non breakable space if the number of operations is not even
            // otherwise the column layout will break within an element
            sideNavItems.length % 2 === 1 ? [...sideNavItems, { label: '\u00a0' }] : sideNavItems
          }
          maxWidth={false}
        />
      </EuiFormRow>

      {shouldDisplayReferenceEditor ? (
        <>
          {selectedColumn.references.map((referenceId, index) => {
            const validation = selectedOperationDefinition.requiredReferences[index];
            const layer = state.layers[layerId];
            return (
              <ReferenceEditor
                operationDefinitionMap={operationDefinitionMap}
                key={index}
                layer={layer}
                layerId={layerId}
                activeData={props.activeData}
                columnId={referenceId}
                column={layer.columns[referenceId]}
                incompleteColumn={
                  layer.incompleteColumns ? layer.incompleteColumns[referenceId] : undefined
                }
                onResetIncomplete={() => {
                  updateLayer({
                    ...layer,
                    // clean up the incomplete column data for the referenced id
                    incompleteColumns: { ...layer.incompleteColumns, [referenceId]: null },
                  });
                }}
                onDeleteColumn={() => {
                  updateLayer(
                    deleteColumn({
                      layer,
                      columnId: referenceId,
                      indexPattern: currentIndexPattern,
                    })
                  );
                }}
                onChooseFunction={(operationType: string, field?: IndexPatternField) => {
                  const newLayer = insertOrReplaceColumn({
                    layer,
                    columnId: referenceId,
                    op: operationType,
                    indexPattern: currentIndexPattern,
                    field,
                    visualizationGroups: dimensionGroups,
                  });
                  fireOrResetToastChecks(newLayer);
                  updateLayer(newLayer);
                }}
                onChooseField={(choice: FieldChoiceWithOperationType) => {
                  updateLayer(
                    insertOrReplaceColumn({
                      layer,
                      columnId: referenceId,
                      indexPattern: currentIndexPattern,
                      op: choice.operationType,
                      field: currentIndexPattern.getFieldByName(choice.field),
                      visualizationGroups: dimensionGroups,
                    })
                  );
                }}
                paramEditorUpdater={(
                  setter:
                    | FormBasedLayer
                    | ((prevLayer: FormBasedLayer) => FormBasedLayer)
                    | GenericIndexPatternColumn
                ) => {
                  let newLayer: FormBasedLayer;
                  if (typeof setter === 'function') {
                    newLayer = setter(layer);
                  } else if (isColumn(setter)) {
                    newLayer = {
                      ...layer,
                      columns: {
                        ...layer.columns,
                        [referenceId]: setter,
                      },
                    };
                  } else {
                    newLayer = setter;
                  }
                  fireOrResetToastChecks(newLayer);
                  return updateLayer(adjustColumnReferencesForChangedColumn(newLayer, referenceId));
                }}
                validation={validation}
                currentIndexPattern={currentIndexPattern}
                selectionStyle={selectedOperationDefinition.selectionStyle}
                dateRange={dateRange}
                labelAppend={selectedOperationDefinition?.getHelpMessage?.({
                  data: props.data,
                  uiSettings: props.uiSettings,
                  currentColumn: layer.columns[columnId],
                })}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
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
      {!isFullscreen && !incompleteInfo && !hideGrouping && temporaryState === 'none' && (
        <BucketNestingEditor
          layer={state.layers[props.layerId]}
          columnId={props.columnId}
          setColumns={(columnOrder) => updateLayer({ columnOrder })}
          getFieldByName={currentIndexPattern.getFieldByName}
        />
      )}

      {shouldDisplayExtraOptions && <ParamEditor {...paramEditorProps} />}
      {!selectedOperationDefinition?.handleDataSectionExtra && (
        <>
          <EuiSpacer size="m" />
          {props.dataSectionExtra}
        </>
      )}
    </>
  );

  const customParamEditor = ParamEditor ? (
    <>
      <ParamEditor
        layer={state.layers[layerId]}
        activeData={props.activeData}
        paramEditorUpdater={
          temporaryStaticValue ? moveDefinitelyToStaticValueAndUpdate : setStateWrapper
        }
        columnId={columnId}
        currentColumn={state.layers[layerId].columns[columnId]}
        operationDefinitionMap={operationDefinitionMap}
        layerId={layerId}
        paramEditorCustomProps={paramEditorCustomProps}
        dateRange={dateRange}
        isFullscreen={isFullscreen}
        indexPattern={currentIndexPattern}
        toggleFullscreen={toggleFullscreen}
        ReferenceEditor={ReferenceEditor}
        {...services}
      />
    </>
  ) : null;

  const ButtonGroupContent = showQuickFunctions ? quickFunctions : customParamEditor;

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

  const hasButtonGroups = !isFullscreen && (hasFormula || supportStaticValue);
  const initialMethod = useMemo(() => {
    let methodId = '';
    if (showStaticValueFunction) {
      methodId = staticValueOperationName;
    } else if (showQuickFunctions) {
      methodId = quickFunctionsName;
    } else if (
      temporaryState === 'none' &&
      selectedColumn?.operationType === formulaOperationName
    ) {
      methodId = formulaOperationName;
    }
    return methodId;
  }, [selectedColumn?.operationType, showQuickFunctions, showStaticValueFunction, temporaryState]);
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);

  const options: DimensionEditorGroupsOptions[] = [
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
        defaultMessage: 'Quick function',
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
            state.layers[layerId].columns,
            props.indexPatterns[state.layers[layerId].indexPatternId]
          )
      ),
    [layerId, selectedColumn, props.indexPatterns, state.layers]
  );

  /**
   * Advanced options can cause side effects on other columns (i.e. formulas)
   * so before updating the layer the full insertOrReplaceColumn needs to be performed
   */
  const updateAdvancedOption = useCallback(
    (newLayer) => {
      if (selectedColumn) {
        setStateWrapper(
          // formula need to regenerate from scratch
          selectedColumn.operationType === formulaOperationName
            ? insertOrReplaceColumn({
                op: selectedColumn.operationType,
                layer: newLayer,
                columnId,
                indexPattern: currentIndexPattern,
                visualizationGroups: dimensionGroups,
              })
            : newLayer
        );
      }
    },
    [columnId, currentIndexPattern, dimensionGroups, selectedColumn, setStateWrapper]
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
      <div className="lnsIndexPatternDimensionEditor--padded">
        <EuiText
          size="s"
          css={css`
            margin-bottom: ${euiTheme.size.base};
          `}
        >
          <h4>
            {paramEditorCustomProps?.headingLabel ??
              i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingData', {
                defaultMessage: 'Data',
              })}
          </h4>
        </EuiText>
        <>
          {hasButtonGroups ? (
            <DimensionEditorButtonGroups
              options={options}
              onMethodChange={(optionId: string) => {
                setSelectedMethod(optionId);
              }}
              selectedMethod={selectedMethod}
            />
          ) : null}
          <CalloutWarning
            currentOperationType={selectedColumn?.operationType}
            temporaryStateType={temporaryState}
          />
          {ButtonGroupContent}
        </>
      </div>

      {shouldDisplayAdvancedOptions && (
        <AdvancedOptions
          options={[
            {
              dataTestSubj: 'indexPattern-time-scaling-enable',
              inlineElement: selectedOperationDefinition.timeScalingMode ? (
                <TimeScaling
                  selectedColumn={selectedColumn}
                  columnId={columnId}
                  layer={state.layers[layerId]}
                  updateLayer={updateAdvancedOption}
                />
              ) : null,
            },
            {
              dataTestSubj: 'indexPattern-filter-by-enable',
              inlineElement: selectedOperationDefinition.filterable ? (
                <Filtering
                  indexPattern={currentIndexPattern}
                  selectedColumn={selectedColumn}
                  columnId={columnId}
                  layer={state.layers[layerId]}
                  updateLayer={updateAdvancedOption}
                  helpMessage={getHelpMessage(selectedOperationDefinition.filterable)}
                />
              ) : null,
            },
            {
              dataTestSubj: 'indexPattern-reducedTimeRange-enable',
              inlineElement: selectedOperationDefinition.canReduceTimeRange ? (
                <ReducedTimeRange
                  selectedColumn={selectedColumn}
                  columnId={columnId}
                  indexPattern={currentIndexPattern}
                  layer={state.layers[layerId]}
                  updateLayer={updateAdvancedOption}
                  skipLabelUpdate={hasFormula}
                  helpMessage={getHelpMessage(selectedOperationDefinition.canReduceTimeRange)}
                />
              ) : null,
            },
            {
              dataTestSubj: 'indexPattern-time-shift-enable',
              inlineElement: Boolean(
                selectedOperationDefinition.shiftable &&
                  (currentIndexPattern.timeFieldName ||
                    Object.values(state.layers[layerId].columns).some(
                      (col) => col.operationType === 'date_histogram'
                    ))
              ) ? (
                <TimeShift
                  datatableUtilities={services.data.datatableUtilities}
                  indexPattern={currentIndexPattern}
                  selectedColumn={selectedColumn}
                  columnId={columnId}
                  layer={state.layers[layerId]}
                  updateLayer={updateAdvancedOption}
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
      )}

      {!isFullscreen && !currentFieldIsInvalid && (
        <div className="lnsIndexPatternDimensionEditor--padded lnsIndexPatternDimensionEditor--collapseNext">
          {!incompleteInfo && temporaryState === 'none' && selectedColumn && (
            <EuiText
              size="s"
              css={css`
                margin-bottom: ${euiTheme.size.base};
              `}
            >
              <h4>
                {i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingAppearance', {
                  defaultMessage: 'Appearance',
                })}
              </h4>
            </EuiText>
          )}
          <>
            {!incompleteInfo && selectedColumn && temporaryState === 'none' && (
              <NameInput
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
                            state.layers[layerId].columns,
                            props.indexPatterns[state.layers[layerId].indexPatternId]
                          ) !== value,
                      },
                    },
                  });
                }}
              />
            )}

            {enableFormatSelector &&
            !isFullscreen &&
            selectedColumn &&
            (selectedColumn.dataType === 'number' || selectedColumn.operationType === 'range') ? (
              <FormatSelector
                selectedColumn={selectedColumn}
                onChange={onFormatChange}
                docLinks={props.core.docLinks}
              />
            ) : null}
          </>
        </div>
      )}
    </div>
  );
}
