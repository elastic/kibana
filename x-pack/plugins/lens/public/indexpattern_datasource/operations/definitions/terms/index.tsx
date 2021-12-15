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
import { AggFunctionsMapping } from '../../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { updateColumnParam } from '../../layer_helpers';
import type { DataType } from '../../../../types';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesInput } from './values_input';
import { getInvalidFieldMessage } from '../helpers';
import { FieldInputs, MAX_MULTI_FIELDS_SIZE } from './field_inputs';
import {
  FieldInput as FieldInputBase,
  getErrorMessage,
} from '../../../dimension_panel/field_input';
import type { TermsIndexPatternColumn } from './types';
import {
  getDisallowedTermsMessage,
  getMultiTermsScriptedFieldErrorMessage,
  isSortableByColumn,
} from './helpers';

export type { TermsIndexPatternColumn } from './types';

const missingFieldLabel = i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
  defaultMessage: 'Missing field',
});

function ofName(name?: string, count: number = 0) {
  if (count) {
    return i18n.translate('xpack.lens.indexPattern.multipleTermsOf', {
      defaultMessage: 'Top values of {name} + {count} {count, plural, one {other} other {others}}',
      values: {
        name: name ?? missingFieldLabel,
        count,
      },
    });
  }
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top values of {name}',
    values: {
      name: name ?? missingFieldLabel,
    },
  });
}

const idPrefix = htmlIdGenerator()();
const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field'> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top values',
  }),
  priority: 3, // Higher than any metric
  input: 'field',
  canAddNewField: (column) => {
    return (column.params?.secondaryFields?.length ?? 0) < MAX_MULTI_FIELDS_SIZE;
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
      return { dataType: type as DataType, isBucketed: true, scale: 'ordinal' };
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
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms) &&
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
      },
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern, layer, uiSettings, orderedColumnIds) => {
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
      column.params.secondaryFields?.length
    ),
  onFieldChange: (oldColumn, field) => {
    // reset the secondary fields
    const newParams = { ...oldColumn.params, secondaryFields: undefined };
    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: ofName(field.displayName),
      sourceField: field.name,
      params: newParams,
    };
  },
  onOtherColumnChanged: (layer, thisColumnId, changedColumnId) => {
    const columns = layer.columns;
    const currentColumn = columns[thisColumnId] as TermsIndexPatternColumn;
    if (currentColumn.params.orderBy.type === 'column' || currentColumn.params.orderBy.fallback) {
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
    } = props;
    const onFieldSelectChange = useCallback(
      (fields) => {
        const column = layer.columns[columnId] as TermsIndexPatternColumn;
        updateLayer({
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              ...column,
              sourceField: fields[0],
              label: ofName(indexPattern.getFieldByName(fields[0])?.displayName, fields.length - 1),
              params: {
                ...column.params,
                secondaryFields: fields.length > 1 ? fields.slice(1) : undefined,
              },
            },
          } as Record<string, TermsIndexPatternColumn>,
        });
      },
      [columnId, indexPattern, layer, updateLayer]
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
        isInvalid={Boolean(showScriptedFieldError)}
        error={
          showScriptedFieldError
            ? i18n.translate('xpack.lens.indexPattern.terms.scriptedFieldErrorShort', {
                defaultMessage: 'Scripted fields are not supported when using multiple fields',
              })
            : []
        }
      >
        <FieldInputs
          column={selectedColumn}
          indexPattern={indexPattern}
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          onChange={onFieldSelectChange}
        />
      </EuiFormRow>
    );
  },
  paramEditor: function ParamEditor({ layer, updateLayer, currentColumn, columnId, indexPattern }) {
    const hasRestrictions = indexPattern.hasRestrictions;

    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical', fallback: false };
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

    return (
      <>
        <ValuesInput
          value={currentColumn.params.size}
          onChange={(value) => {
            updateLayer(
              updateColumnParam({
                layer,
                columnId,
                paramName: 'size',
                value,
              })
            );
          }}
        />
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
              const updatedLayer = updateColumnParam({
                layer,
                columnId,
                paramName: 'orderBy',
                value: newOrderByValue,
              });
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
          {/* <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderDirection"
            options={[
              {
                value: 'asc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderAscending', {
                  defaultMessage: 'Ascending',
                }),
              },
              {
                value: 'desc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderDescending', {
                  defaultMessage: 'Descending',
                }),
              },
            ]}
            value={currentColumn.params.orderDirection}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderDirection',
                  value: e.target.value as 'asc' | 'desc',
                })
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Rank by',
            })}
          /> */}
        </EuiFormRow>
        {!hasRestrictions && (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id="lnsTermsAdvanced"
              buttonContent={i18n.translate('xpack.lens.indexPattern.terms.advancedSettings', {
                defaultMessage: 'Advanced',
              })}
            >
              <EuiSpacer size="m" />
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.otherBucketDescription', {
                  defaultMessage: 'Group other values as "Other"',
                })}
                compressed
                data-test-subj="indexPattern-terms-other-bucket"
                checked={Boolean(currentColumn.params.otherBucket)}
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
                  indexPattern.getFieldByName(currentColumn.sourceField)?.type !== 'string'
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
            </EuiAccordion>
          </>
        )}
      </>
    );
  },
};
