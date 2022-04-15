/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
  EuiAccordion,
  EuiIconTip,
  htmlIdGenerator,
  EuiButtonGroup,
} from '@elastic/eui';
import { uniq } from 'lodash';
import { AggFunctionsMapping } from '../../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { insertOrReplaceColumn, updateColumnParam, updateDefaultLabels } from '../../layer_helpers';
import type { DataType } from '../../../../types';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesInput } from './values_input';
import { getInvalidFieldMessage } from '../helpers';
import { FieldInputs, getInputFieldErrorMessage, MAX_MULTI_FIELDS_SIZE } from './field_inputs';
import {
  FieldInput as FieldInputBase,
  getErrorMessage,
} from '../../../dimension_panel/field_input';
import type { TermsIndexPatternColumn } from './types';
import type { IndexPatternField } from '../../../types';
import {
  getDisallowedTermsMessage,
  getMultiTermsScriptedFieldErrorMessage,
  getFieldsByValidationState,
  isSortableByColumn,
} from './helpers';
import {
  DEFAULT_MAX_DOC_COUNT,
  DEFAULT_SIZE,
  MAXIMUM_MAX_DOC_COUNT,
  supportedTypes,
} from './constants';

export function supportsRarityRanking(field?: IndexPatternField) {
  // these es field types can't be sorted by rarity
  return !field?.esTypes?.some((esType) =>
    ['double', 'float', 'half_float', 'scaled_float'].includes(esType)
  );
}

export type { TermsIndexPatternColumn } from './types';

const missingFieldLabel = i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
  defaultMessage: 'Missing field',
});

function ofName(
  name?: string,
  secondaryFieldsCount: number = 0,
  rare: boolean = false,
  termsSize: number = 0
) {
  if (rare) {
    return i18n.translate('xpack.lens.indexPattern.rareTermsOf', {
      defaultMessage: 'Rare values of {name}',
      values: {
        name: name ?? missingFieldLabel,
      },
    });
  }
  if (secondaryFieldsCount) {
    return i18n.translate('xpack.lens.indexPattern.multipleTermsOf', {
      defaultMessage: 'Top values of {name} + {count} {count, plural, one {other} other {others}}',
      values: {
        name: name ?? missingFieldLabel,
        count: secondaryFieldsCount,
      },
    });
  }
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage:
      'Top {numberOfTermsLabel}{termsCount, plural, one {value} other {values}} of {name}',
    values: {
      name: name ?? missingFieldLabel,
      termsCount: termsSize,
      numberOfTermsLabel: termsSize > 1 ? `${termsSize} ` : '',
    },
  });
}

// It is not always possible to know if there's a numeric field, so just ignore it for now
function getParentFormatter(params: Partial<TermsIndexPatternColumn['params']>) {
  return { id: params.secondaryFields?.length ? 'multi_terms' : 'terms' };
}

const idPrefix = htmlIdGenerator()();

export const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field'> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top values',
  }),
  priority: 3, // Higher than any metric
  input: 'field',
  getCurrentFields: (targetColumn) => {
    return [targetColumn.sourceField, ...(targetColumn?.params?.secondaryFields ?? [])];
  },
  getParamsForMultipleFields: ({ targetColumn, sourceColumn, field, indexPattern }) => {
    const secondaryFields = new Set<string>(
      getFieldsByValidationState(indexPattern, targetColumn).validFields
    );

    const validFieldsToAdd = getFieldsByValidationState(
      indexPattern,
      sourceColumn,
      field
    ).validFields;

    for (const validField of validFieldsToAdd) {
      secondaryFields.add(validField);
    }
    // remove the sourceField
    secondaryFields.delete(targetColumn.sourceField);

    const secondaryFieldsList: string[] = [...secondaryFields];
    const ret: Partial<TermsIndexPatternColumn['params']> = {
      secondaryFields: secondaryFieldsList,
      parentFormat: getParentFormatter({
        ...targetColumn.params,
        secondaryFields: secondaryFieldsList,
      }),
    };
    return ret;
  },
  canAddNewField: ({ targetColumn, sourceColumn, field, indexPattern }) => {
    if (targetColumn.params.orderBy.type === 'rare') {
      return false;
    }
    // collect the fields from the targetColumn
    const originalTerms = new Set(
      getFieldsByValidationState(indexPattern, targetColumn).validFields
    );
    // now check how many fields can be added
    const { validFields } = getFieldsByValidationState(indexPattern, sourceColumn, field);
    const counter = validFields.filter((fieldName) => !originalTerms.has(fieldName)).length;
    // reject when there are no new fields to add
    if (!counter) {
      return false;
    }
    return counter + (targetColumn.params?.secondaryFields?.length ?? 0) <= MAX_MULTI_FIELDS_SIZE;
  },
  getDefaultVisualSettings: (column) => ({
    truncateText: Boolean(!column.params?.secondaryFields?.length),
  }),
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.terms)
    ) {
      return {
        dataType: type as DataType,
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) => {
    const messages = [
      ...(getInvalidFieldMessage(
        layer.columns[columnId] as FieldBasedIndexPatternColumn,
        indexPattern
      ) || []),
      getDisallowedTermsMessage(layer, columnId, indexPattern) || '',
      getMultiTermsScriptedFieldErrorMessage(layer, columnId, indexPattern) || '',
    ].filter(Boolean);
    return messages.length ? messages : undefined;
  },
  getNonTransferableFields: (column, newIndexPattern) => {
    return getFieldsByValidationState(newIndexPattern, column).invalidFields;
  },
  isTransferable: (column, newIndexPattern) => {
    const { allFields, invalidFields } = getFieldsByValidationState(newIndexPattern, column);

    return Boolean(
      allFields.length &&
        invalidFields.length === 0 &&
        (!column.params.otherBucket || !newIndexPattern.hasRestrictions)
    );
  },
  buildColumn({ layer, field, indexPattern }) {
    const existingMetricColumn = Object.entries(layer.columns)
      .filter(([columnId]) => isSortableByColumn(layer, columnId))
      .map(([id]) => id)[0];

    const previousBucketsLength = Object.values(layer.columns).filter(
      (col) => col && col.isBucketed
    ).length;

    return {
      label: ofName(field.displayName),
      dataType: field.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      sourceField: field.name,
      isBucketed: true,
      params: {
        size: previousBucketsLength === 0 ? 5 : DEFAULT_SIZE,
        orderBy: existingMetricColumn
          ? {
              type: 'column',
              columnId: existingMetricColumn,
            }
          : { type: 'alphabetical', fallback: true },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
        otherBucket: !indexPattern.hasRestrictions,
        missingBucket: false,
        parentFormat: { id: 'terms' },
      },
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern, layer, uiSettings, orderedColumnIds) => {
    if (column.params?.orderBy.type === 'rare') {
      return buildExpressionFunction<AggFunctionsMapping['aggRareTerms']>('aggRareTerms', {
        id: columnId,
        enabled: true,
        schema: 'segment',
        field: column.sourceField,
        max_doc_count: column.params.orderBy.maxDocCount,
      }).toAst();
    }

    // To get more accurate results, we set shard_size to a minimum of 1000
    // The other calculation matches the current Elasticsearch shard_size default,
    // but they may diverge in the future
    const shardSize = column.params.accuracyMode
      ? Math.max(1000, column.params.size * 1.5 + 10)
      : undefined;

    if (column.params?.secondaryFields?.length) {
      return buildExpressionFunction<AggFunctionsMapping['aggMultiTerms']>('aggMultiTerms', {
        id: columnId,
        enabled: true,
        schema: 'segment',
        fields: [column.sourceField, ...column.params.secondaryFields],
        orderBy:
          column.params.orderBy.type === 'alphabetical'
            ? '_key'
            : String(orderedColumnIds.indexOf(column.params.orderBy.columnId)),
        order: column.params.orderDirection,
        size: column.params.size,
        shardSize,
        otherBucket: Boolean(column.params.otherBucket),
        otherBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.otherLabel', {
          defaultMessage: 'Other',
        }),
      }).toAst();
    }
    return buildExpressionFunction<AggFunctionsMapping['aggTerms']>('aggTerms', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      orderBy:
        column.params.orderBy.type === 'alphabetical'
          ? '_key'
          : String(orderedColumnIds.indexOf(column.params.orderBy.columnId)),
      order: column.params.orderDirection,
      size: column.params.size,
      shardSize,
      otherBucket: Boolean(column.params.otherBucket),
      otherBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.otherLabel', {
        defaultMessage: 'Other',
      }),
      missingBucket: column.params.otherBucket && column.params.missingBucket,
      missingBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.missingLabel', {
        defaultMessage: '(missing value)',
      }),
    }).toAst();
  },
  getDefaultLabel: (column, indexPattern) =>
    ofName(
      indexPattern.getFieldByName(column.sourceField)?.displayName,
      column.params.secondaryFields?.length,
      column.params.orderBy.type === 'rare',
      column.params.size
    ),
  onFieldChange: (oldColumn, field, params) => {
    const newParams = {
      ...oldColumn.params,
      secondaryFields: undefined,
      ...(params as Partial<TermsIndexPatternColumn['params']>),
    };
    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    newParams.parentFormat = getParentFormatter(newParams);
    if (!supportsRarityRanking(field) && newParams.orderBy.type === 'rare') {
      newParams.orderBy = { type: 'alphabetical' };
    }

    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: oldColumn.customLabel
        ? oldColumn.label
        : ofName(
            field.displayName,
            newParams.secondaryFields?.length,
            newParams.orderBy.type === 'rare',
            newParams.size
          ),
      sourceField: field.name,
      params: newParams,
    };
  },
  onOtherColumnChanged: (layer, thisColumnId, changedColumnId) => {
    const columns = layer.columns;
    const currentColumn = columns[thisColumnId] as TermsIndexPatternColumn;
    if (
      currentColumn.params.orderBy.type === 'column' ||
      (currentColumn.params.orderBy.type === 'alphabetical' &&
        currentColumn.params.orderBy.fallback)
    ) {
      // check whether the column is still there and still a metric
      const columnSortedBy =
        currentColumn.params.orderBy.type === 'column'
          ? columns[currentColumn.params.orderBy.columnId]
          : undefined;
      if (
        !columnSortedBy ||
        (currentColumn.params.orderBy.type === 'column' &&
          !isSortableByColumn(layer, currentColumn.params.orderBy.columnId))
      ) {
        // check whether we can find another metric column to sort by
        const existingMetricColumn = Object.entries(layer.columns)
          .filter(([columnId]) => isSortableByColumn(layer, columnId))
          .map(([id]) => id)[0];
        return {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            orderBy: existingMetricColumn
              ? { type: 'column', columnId: existingMetricColumn }
              : { type: 'alphabetical', fallback: true },
            orderDirection: existingMetricColumn ? 'desc' : 'asc',
          },
        };
      }
    }
    return currentColumn;
  },
  renderFieldInput: function FieldInput(props) {
    const {
      layer,
      selectedColumn,
      columnId,
      indexPattern,
      existingFields,
      operationSupportMatrix,
      updateLayer,
      dimensionGroups,
      groupId,
      incompleteParams,
    } = props;
    const onFieldSelectChange = useCallback(
      (fields: string[]) => {
        const column = layer.columns[columnId] as TermsIndexPatternColumn;
        const [sourcefield, ...secondaryFields] = fields;
        const dataTypes = uniq(fields.map((field) => indexPattern.getFieldByName(field)?.type));
        const newDataType = (dataTypes.length === 1 ? dataTypes[0] : 'string') || column.dataType;
        const newParams = {
          ...column.params,
        };
        if ('format' in newParams && newDataType !== 'number') {
          delete newParams.format;
        }
        const mainField = indexPattern.getFieldByName(sourcefield);
        if (!supportsRarityRanking(mainField) && newParams.orderBy.type === 'rare') {
          newParams.orderBy = { type: 'alphabetical' };
        }
        // in single field mode, allow the automatic switch of the function to
        // the most appropriate one
        if (fields.length === 1) {
          const possibleOperations = operationSupportMatrix.operationByField[sourcefield];
          const termsSupported = possibleOperations?.has('terms');
          if (!termsSupported) {
            const newFieldOp = possibleOperations?.values().next().value;
            return updateLayer(
              insertOrReplaceColumn({
                layer,
                columnId,
                indexPattern,
                op: newFieldOp,
                field: mainField,
                visualizationGroups: dimensionGroups,
                targetGroup: groupId,
                incompleteParams,
              })
            );
          }
        }
        updateLayer({
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              ...column,
              dataType: newDataType,
              sourceField: sourcefield,
              label: column.customLabel
                ? column.label
                : ofName(
                    mainField?.displayName,
                    fields.length - 1,
                    newParams.orderBy.type === 'rare',
                    newParams.size
                  ),
              params: {
                ...newParams,
                secondaryFields,
                parentFormat: getParentFormatter({
                  ...newParams,
                  secondaryFields,
                }),
              },
            },
          } as Record<string, TermsIndexPatternColumn>,
        });
      },
      [
        columnId,
        dimensionGroups,
        groupId,
        incompleteParams,
        indexPattern,
        layer,
        operationSupportMatrix.operationByField,
        updateLayer,
      ]
    );
    const currentColumn = layer.columns[columnId];

    const fieldErrorMessage = getErrorMessage(
      selectedColumn,
      Boolean(props.incompleteOperation),
      'field',
      props.currentFieldIsInvalid
    );

    // let the default component do its job in case of incomplete informations
    if (
      !currentColumn ||
      !selectedColumn ||
      props.incompleteOperation ||
      (fieldErrorMessage && !selectedColumn.params?.secondaryFields?.length)
    ) {
      return <FieldInputBase {...props} />;
    }

    const showScriptedFieldError = Boolean(
      getMultiTermsScriptedFieldErrorMessage(layer, columnId, indexPattern)
    );
    const { invalidFields } = getFieldsByValidationState(indexPattern, selectedColumn);

    return (
      <EuiFormRow
        data-test-subj="indexPattern-field-selection-row"
        label={i18n.translate('xpack.lens.indexPattern.terms.chooseFields', {
          defaultMessage: '{count, plural, zero {Field} other {Fields}}',
          values: {
            count: selectedColumn.params?.secondaryFields?.length || 0,
          },
        })}
        fullWidth
        isInvalid={Boolean(showScriptedFieldError || invalidFields.length)}
        error={getInputFieldErrorMessage(showScriptedFieldError, invalidFields)}
      >
        <FieldInputs
          column={selectedColumn}
          indexPattern={indexPattern}
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          onChange={onFieldSelectChange}
          invalidFields={invalidFields}
        />
      </EuiFormRow>
    );
  },
  paramEditor: function ParamEditor({ layer, updateLayer, currentColumn, columnId, indexPattern }) {
    const hasRestrictions = indexPattern.hasRestrictions;

    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type !== 'column') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical', fallback: false };
      }
      if (value === 'rare') {
        return { type: 'rare', maxDocCount: DEFAULT_MAX_DOC_COUNT };
      }
      const parts = value.split(SEPARATOR);
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    const orderOptions = Object.entries(layer.columns)
      .filter(([sortId]) => isSortableByColumn(layer, sortId))
      .map(([sortId, column]) => {
        return {
          value: toValue({ type: 'column', columnId: sortId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.terms.orderAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    });
    if (
      !currentColumn.params.secondaryFields?.length &&
      supportsRarityRanking(indexPattern.getFieldByName(currentColumn.sourceField))
    ) {
      orderOptions.push({
        value: toValue({ type: 'rare', maxDocCount: DEFAULT_MAX_DOC_COUNT }),
        text: i18n.translate('xpack.lens.indexPattern.terms.orderRare', {
          defaultMessage: 'Rarity',
        }),
      });
    }

    const secondaryFieldsCount = currentColumn.params.secondaryFields
      ? currentColumn.params.secondaryFields.length
      : 0;

    return (
      <>
        <ValuesInput
          value={currentColumn.params.size}
          disabled={currentColumn.params.orderBy.type === 'rare'}
          onChange={(value) => {
            updateLayer({
              ...layer,
              columns: {
                ...layer.columns,
                [columnId]: {
                  ...currentColumn,
                  label: currentColumn.customLabel
                    ? currentColumn.label
                    : ofName(
                        indexPattern.getFieldByName(currentColumn.sourceField)?.displayName,
                        secondaryFieldsCount,
                        currentColumn.params.orderBy.type === 'rare',
                        value
                      ),
                  params: {
                    ...currentColumn.params,
                    size: value,
                  },
                },
              } as Record<string, TermsIndexPatternColumn>,
            });
          }}
        />
        {currentColumn.params.orderBy.type === 'rare' && (
          <ValuesInput
            value={currentColumn.params.orderBy.maxDocCount}
            label={i18n.translate('xpack.lens.indexPattern.terms.maxDocCount', {
              defaultMessage: 'Max doc count per term',
            })}
            maxValue={MAXIMUM_MAX_DOC_COUNT}
            onChange={(value) => {
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderBy',
                  value: { ...currentColumn.params.orderBy, maxDocCount: value },
                })
              );
            }}
          />
        )}
        <EuiFormRow
          label={
            <>
              {i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
                defaultMessage: 'Rank by',
              })}{' '}
              <EuiIconTip
                color="subdued"
                content={i18n.translate('xpack.lens.indexPattern.terms.orderByHelp', {
                  defaultMessage: `Specifies the dimension the top values are ranked by.`,
                })}
                iconProps={{
                  className: 'eui-alignTop',
                }}
                position="top"
                size="s"
                type="questionInCircle"
              />
            </>
          }
          display="rowCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderBy"
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newOrderByValue = fromValue(e.target.value);
              const updatedLayer = updateDefaultLabels(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderBy',
                  value: newOrderByValue,
                }),
                indexPattern
              );

              updateLayer(
                updateColumnParam({
                  layer: updatedLayer,
                  columnId,
                  paramName: 'orderDirection',
                  value: newOrderByValue.type === 'alphabetical' ? 'asc' : 'desc',
                })
              );
            }}
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Rank by',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
            defaultMessage: 'Rank direction',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
              defaultMessage: 'Rank direction',
            })}
            data-test-subj="indexPattern-terms-orderDirection-groups"
            name="orderDirection"
            buttonSize="compressed"
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
              defaultMessage: 'Rank direction',
            })}
            isDisabled={currentColumn.params.orderBy.type === 'rare'}
            options={[
              {
                id: `${idPrefix}asc`,
                'data-test-subj': 'indexPattern-terms-orderDirection-groups-asc',
                value: 'asc',
                label: i18n.translate('xpack.lens.indexPattern.terms.orderAscending', {
                  defaultMessage: 'Ascending',
                }),
              },
              {
                id: `${idPrefix}desc`,
                'data-test-subj': 'indexPattern-terms-orderDirection-groups-desc',
                value: 'desc',
                label: i18n.translate('xpack.lens.indexPattern.terms.orderDescending', {
                  defaultMessage: 'Descending',
                }),
              },
            ]}
            idSelected={`${idPrefix}${currentColumn.params.orderDirection}`}
            onChange={(id) => {
              const value = id.replace(
                idPrefix,
                ''
              ) as TermsIndexPatternColumn['params']['orderDirection'];
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderDirection',
                  value,
                })
              );
            }}
          />
        </EuiFormRow>
        {!hasRestrictions && (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id="lnsTermsAdvanced"
              buttonContent={i18n.translate('xpack.lens.indexPattern.terms.advancedSettings', {
                defaultMessage: 'Advanced',
              })}
              data-test-subj="indexPattern-terms-advanced"
            >
              <EuiSpacer size="m" />
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.otherBucketDescription', {
                  defaultMessage: 'Group other values as "Other"',
                })}
                compressed
                data-test-subj="indexPattern-terms-other-bucket"
                checked={Boolean(currentColumn.params.otherBucket)}
                disabled={currentColumn.params.orderBy.type === 'rare'}
                onChange={(e: EuiSwitchEvent) =>
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'otherBucket',
                      value: e.target.checked,
                    })
                  )
                }
              />
              <EuiSpacer size="m" />
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.missingBucketDescription', {
                  defaultMessage: 'Include documents without this field',
                })}
                compressed
                disabled={
                  !currentColumn.params.otherBucket ||
                  indexPattern.getFieldByName(currentColumn.sourceField)?.type !== 'string' ||
                  currentColumn.params.orderBy.type === 'rare'
                }
                data-test-subj="indexPattern-terms-missing-bucket"
                checked={Boolean(currentColumn.params.missingBucket)}
                onChange={(e: EuiSwitchEvent) =>
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'missingBucket',
                      value: e.target.checked,
                    })
                  )
                }
              />
              <EuiSpacer size="m" />
              <EuiSwitch
                label={
                  <>
                    {i18n.translate('xpack.lens.indexPattern.terms.accuracyModeDescription', {
                      defaultMessage: 'Enable accuracy mode',
                    })}{' '}
                    <EuiIconTip
                      color="subdued"
                      content={i18n.translate('xpack.lens.indexPattern.terms.accuracyModeHelp', {
                        defaultMessage: `Improves results for high-cardinality data, but increases the load on the Elasticsearch cluster.`,
                      })}
                      iconProps={{
                        className: 'eui-alignTop',
                      }}
                      position="top"
                      size="s"
                      type="questionInCircle"
                    />
                  </>
                }
                compressed
                disabled={currentColumn.params.orderBy.type === 'rare'}
                data-test-subj="indexPattern-accuracy-mode"
                checked={Boolean(
                  currentColumn.params.accuracyMode && currentColumn.params.orderBy.type !== 'rare'
                )}
                onChange={(e: EuiSwitchEvent) =>
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'accuracyMode',
                      value: e.target.checked,
                    })
                  )
                }
              />
            </EuiAccordion>
          </>
        )}
      </>
    );
  },
};
