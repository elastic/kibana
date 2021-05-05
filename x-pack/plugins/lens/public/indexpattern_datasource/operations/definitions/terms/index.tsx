/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
  EuiAccordion,
  EuiIconTip,
} from '@elastic/eui';
import { uniq } from 'lodash';
import { HttpSetup } from 'kibana/public';
import { FieldStatsResponse } from '../../../../../common';
import { AggFunctionsMapping } from '../../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { updateColumnParam, isReferenced } from '../../layer_helpers';
import { DataType } from '../../../../types';
import { FiltersIndexPatternColumn, OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesInput } from './values_input';
import { getInvalidFieldMessage } from '../helpers';
import type { IndexPatternLayer, IndexPatternPrivateState } from '../../../types';

function ofName(name?: string) {
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top values of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
          defaultMessage: 'Missing field',
        }),
    },
  });
}

function isSortableByColumn(layer: IndexPatternLayer, columnId: string) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    column.operationType !== 'last_value' &&
    !('references' in column) &&
    !isReferenced(layer, columnId)
  );
}

function getDisallowedTermsMessage(
  layer: IndexPatternLayer,
  columnId: string,
  state?: IndexPatternPrivateState,
  layerId?: string
) {
  const hasMultipleShifts =
    uniq(Object.values(layer.columns).map((col) => col.timeShift !== '')).length > 1;
  if (!hasMultipleShifts) {
    return undefined;
  }
  const dateHistogramParent = layer.columnOrder
    .slice(0, layer.columnOrder.indexOf(columnId))
    .find((colId) => layer.columns[colId].operationType === 'date_histogram');

  if (!dateHistogramParent) {
    return undefined;
  }
  return {
    message: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShifts', {
      defaultMessage:
        "Can't use multiple time shifts in a single layer together with dynamic top values. Either use the same time shift for all metrics or use filters instead of top values.",
    }),
    fixAction:
      state && layerId
        ? {
            label: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShiftsFixActionLabel', {
              defaultMessage: 'Pin top values',
            }),
            newState: async (http: HttpSetup) => {
              const indexPattern = state.indexPatterns[layer.indexPatternId];
              const fieldName = (layer.columns[columnId] as TermsIndexPatternColumn).sourceField;
              const response: FieldStatsResponse<string | number> = await http.post(
                `/api/lens/index_stats/${indexPattern.id}/field`,
                {
                  body: JSON.stringify({
                    fieldName,
                  }),
                }
              );
              return {
                ...state,
                layers: {
                  ...state.layers,
                  [layerId]: {
                    ...layer,
                    columns: {
                      ...layer.columns,
                      [columnId]: {
                        ...layer.columns[columnId],
                        operationType: 'filters',
                        params: {
                          filters: response.topValues?.buckets.map(({ key }) => ({
                            input: {
                              query: `${fieldName}: "${key}"`,
                              language: 'kuery',
                            },
                            label: '',
                          })),
                        },
                      } as FiltersIndexPatternColumn,
                    },
                  },
                },
              };
            },
          }
        : undefined,
  };
}

function getInvalidNestingOrderMessage(
  layer: IndexPatternLayer,
  columnId: string,
  state?: IndexPatternPrivateState,
  layerId?: string
) {
  const usesTimeShift = Object.values(layer.columns).some(
    (col) => col.timeShift && col.timeShift !== ''
  );
  if (!usesTimeShift) {
    return undefined;
  }
  const dateHistogramParent = layer.columnOrder
    .slice(0, layer.columnOrder.indexOf(columnId))
    .find((colId) => layer.columns[colId].operationType === 'date_histogram');

  if (!dateHistogramParent) {
    return undefined;
  }
  return {
    message: i18n.translate('xpack.lens.indexPattern.termsInShiftedDateHistogramError', {
      defaultMessage:
        'Date histogram "{dateLabel}" is grouped by before "{dimensionLabel}". When using time shifts, make sure to group by top values first.',
      values: {
        dateLabel: layer.columns[dateHistogramParent].label,
        dimensionLabel: layer.columns[columnId].label,
      },
    }),
    fixAction:
      state && layerId
        ? {
            label: i18n.translate(
              'xpack.lens.indexPattern.termsInShiftedDateHistogramFixActionLabel',
              {
                defaultMessage: 'Reorder dimensions',
              }
            ),
            newState: async () => ({
              ...state,
              layers: {
                ...state.layers,
                [layerId]: {
                  ...layer,
                  columns: {
                    ...layer.columns,
                    [dateHistogramParent]: layer.columns[columnId],
                    [columnId]: layer.columns[dateHistogramParent],
                  },
                },
              },
            }),
          }
        : undefined,
  };
}

const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    // if order is alphabetical, the `fallback` flag indicates whether it became alphabetical because there wasn't
    // another option or whether the user explicitly chose to make it alphabetical.
    orderBy: { type: 'alphabetical'; fallback?: boolean } | { type: 'column'; columnId: string };
    orderDirection: 'asc' | 'desc';
    otherBucket?: boolean;
    missingBucket?: boolean;
    // Terms on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field'> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top values',
  }),
  priority: 3, // Higher than any metric
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.terms)
    ) {
      return { dataType: type as DataType, isBucketed: true, scale: 'ordinal' };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern, state, layerId) =>
    [
      ...(getInvalidFieldMessage(
        layer.columns[columnId] as FieldBasedIndexPatternColumn,
        indexPattern
      ) || []),
      getInvalidNestingOrderMessage(layer, columnId, state, layerId) || '',
      getDisallowedTermsMessage(layer, columnId, state, layerId) || '',
    ].filter(Boolean),
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
  toEsAggsFn: (column, columnId, _indexPattern, layer) => {
    return buildExpressionFunction<AggFunctionsMapping['aggTerms']>('aggTerms', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      orderBy:
        column.params.orderBy.type === 'alphabetical' ? '_key' : column.params.orderBy.columnId,
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
    ofName(indexPattern.getFieldByName(column.sourceField)?.displayName),
  onFieldChange: (oldColumn, field) => {
    const newParams = { ...oldColumn.params };
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
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.size', {
            defaultMessage: 'Number of values',
          })}
          display="columnCompressed"
          fullWidth
        >
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
        </EuiFormRow>
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
          display="columnCompressed"
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
          label={
            <>
              {i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
                defaultMessage: 'Rank direction',
              })}{' '}
              <EuiIconTip
                color="subdued"
                content={i18n.translate('xpack.lens.indexPattern.terms.orderDirectionHelp', {
                  defaultMessage: `Specifies the ranking order of the top values.`,
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
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
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
                disabled={!currentColumn.params.otherBucket}
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
