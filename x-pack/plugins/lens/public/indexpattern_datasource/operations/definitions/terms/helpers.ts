/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { GenericIndexPatternColumn, operationDefinitionMap } from '..';
import { defaultLabel } from '../filters';
import { isReferenced } from '../../layer_helpers';

import type { FieldStatsResponse } from '../../../../../common';
import type { FrameDatasourceAPI } from '../../../../types';
import type { FiltersIndexPatternColumn } from '..';
import type { TermsIndexPatternColumn } from './types';
import { LastValueIndexPatternColumn } from '../last_value';

import type { IndexPatternLayer, IndexPattern, IndexPatternField } from '../../../types';
import { MULTI_KEY_VISUAL_SEPARATOR, supportedTypes } from './constants';
import { isColumnOfType } from '../helpers';

const fullSeparatorString = ` ${MULTI_KEY_VISUAL_SEPARATOR} `;

export function getMultiTermsScriptedFieldErrorMessage(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const currentColumn = layer.columns[columnId] as TermsIndexPatternColumn;
  const usedFields = [currentColumn.sourceField, ...(currentColumn.params.secondaryFields ?? [])];

  const scriptedFields = usedFields.filter((field) => indexPattern.getFieldByName(field)?.scripted);
  if (usedFields.length < 2 || !scriptedFields.length) {
    return;
  }

  return i18n.translate('xpack.lens.indexPattern.termsWithMultipleTermsAndScriptedFields', {
    defaultMessage: 'Scripted fields are not supported when using multiple fields, found {fields}',
    values: {
      fields: scriptedFields.join(', '),
    },
  });
}

function getQueryForMultiTerms(fieldNames: string[], term: string) {
  const terms = term.split(fullSeparatorString);
  return fieldNames
    .map((fieldName, i) => `${fieldName}: ${terms[i] !== '*' ? `"${terms[i]}"` : terms[i]}`)
    .join(' AND ');
}

function getQueryLabel(fieldNames: string[], term: string) {
  if (fieldNames.length === 1) {
    return term;
  }
  return term
    .split(fullSeparatorString)
    .map((t: string, index: number) => {
      if (t == null) {
        return i18n.translate('xpack.lens.indexPattern.filterBy.emptyFilterQuery', {
          defaultMessage: '(empty)',
        });
      }
      return `${fieldNames[index]}: ${t}`;
    })
    .join(fullSeparatorString);
}

interface MultiFieldKeyFormat {
  keys: string[];
}

function isMultiFieldValue(term: unknown): term is MultiFieldKeyFormat {
  return (
    typeof term === 'object' &&
    term != null &&
    'keys' in term &&
    Array.isArray((term as MultiFieldKeyFormat).keys)
  );
}

export function getDisallowedTermsMessage(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const hasMultipleShifts =
    uniq(
      Object.values(layer.columns)
        .filter((col) => operationDefinitionMap[col.operationType].shiftable)
        .map((col) => col.timeShift || '')
    ).length > 1;
  if (!hasMultipleShifts) {
    return undefined;
  }
  return {
    message: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShifts', {
      defaultMessage:
        'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
    }),
    fixAction: {
      label: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShiftsFixActionLabel', {
        defaultMessage: 'Use filters',
      }),
      newState: async (core: CoreStart, frame: FrameDatasourceAPI, layerId: string) => {
        const currentColumn = layer.columns[columnId] as TermsIndexPatternColumn;
        const fieldNames = [
          currentColumn.sourceField,
          ...(currentColumn.params?.secondaryFields ?? []),
        ];
        const activeDataFieldNameMatch =
          frame.activeData?.[layerId].columns.find(({ id }) => id === columnId)?.meta.field ===
          fieldNames[0];

        let currentTerms = uniq(
          frame.activeData?.[layerId].rows
            .map((row) => row[columnId] as string | MultiFieldKeyFormat)
            .filter((term) =>
              fieldNames.length > 1
                ? isMultiFieldValue(term) && term.keys[0] !== '__other__'
                : typeof term === 'string' && term !== '__other__'
            )
            .map((term: string | MultiFieldKeyFormat) =>
              isMultiFieldValue(term) ? term.keys.join(fullSeparatorString) : term
            ) || []
        );
        if (!activeDataFieldNameMatch || currentTerms.length === 0) {
          if (fieldNames.length === 1) {
            const response: FieldStatsResponse<string | number> = await core.http.post(
              `/api/lens/index_stats/${indexPattern.id}/field`,
              {
                body: JSON.stringify({
                  fieldName: fieldNames[0],
                  dslQuery: buildEsQuery(
                    indexPattern,
                    frame.query,
                    frame.filters,
                    getEsQueryConfig(core.uiSettings)
                  ),
                  fromDate: frame.dateRange.fromDate,
                  toDate: frame.dateRange.toDate,
                  size: currentColumn.params.size,
                }),
              }
            );
            currentTerms = response.topValues?.buckets.map(({ key }) => String(key)) || [];
          }
        }
        // when multi terms the meta.field will always be undefined, so limit the check to no data
        if (fieldNames.length > 1 && currentTerms.length === 0) {
          // this will produce a query like `field1: * AND field2: * ...etc`
          // which is the best we can do for multiple terms when no data is available
          currentTerms = [Array(fieldNames.length).fill('*').join(fullSeparatorString)];
        }

        return {
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              label: i18n.translate('xpack.lens.indexPattern.pinnedTopValuesLabel', {
                defaultMessage: 'Filters of {field}',
                values: {
                  field:
                    fieldNames.length > 1 ? fieldNames.join(fullSeparatorString) : fieldNames[0],
                },
              }),
              customLabel: true,
              isBucketed: layer.columns[columnId].isBucketed,
              dataType: 'string',
              operationType: 'filters',
              params: {
                filters:
                  currentTerms.length > 0
                    ? currentTerms.map((term) => ({
                        input: {
                          query:
                            fieldNames.length === 1
                              ? `${fieldNames[0]}: "${term}"`
                              : getQueryForMultiTerms(fieldNames, term),
                          language: 'kuery',
                        },
                        label: getQueryLabel(fieldNames, term),
                      }))
                    : [
                        {
                          input: {
                            query: '*',
                            language: 'kuery',
                          },
                          label: defaultLabel,
                        },
                      ],
              },
            } as FiltersIndexPatternColumn,
          },
        };
      },
    },
  };
}

function checkLastValue(column: GenericIndexPatternColumn) {
  return (
    column.operationType !== 'last_value' ||
    (['number', 'date'].includes(column.dataType) &&
      !(column as LastValueIndexPatternColumn).params.showArrayValues)
  );
}

export function isSortableByColumn(layer: IndexPatternLayer, columnId: string) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    checkLastValue(column) &&
    !('references' in column) &&
    !isReferenced(layer, columnId)
  );
}

export function isScriptedField(field: IndexPatternField): boolean;
export function isScriptedField(fieldName: string, indexPattern: IndexPattern): boolean;
export function isScriptedField(
  fieldName: string | IndexPatternField,
  indexPattern?: IndexPattern
) {
  if (typeof fieldName === 'string') {
    const field = indexPattern?.getFieldByName(fieldName);
    return field && field.scripted;
  }
  return fieldName.scripted;
}

export function getFieldsByValidationState(
  newIndexPattern: IndexPattern,
  column?: GenericIndexPatternColumn,
  field?: string | IndexPatternField
): {
  allFields: Array<IndexPatternField | undefined>;
  validFields: string[];
  invalidFields: string[];
} {
  const newFieldNames: string[] = [];
  if (column && 'sourceField' in column) {
    if (column.sourceField) {
      newFieldNames.push(column.sourceField);
    }
    if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
      newFieldNames.push(...(column.params?.secondaryFields ?? []));
    }
  }
  if (field) {
    newFieldNames.push(typeof field === 'string' ? field : field.name || field.displayName);
  }
  const newFields = newFieldNames.map((fieldName) => newIndexPattern.getFieldByName(fieldName));
  // lodash groupby does not provide the index arg, so had to write it manually :(
  const validFields: string[] = [];
  const invalidFields: string[] = [];
  // mind to check whether a column was passed, in such case single term with scripted field is ok
  const canAcceptScripted = Boolean(column && newFields.length === 1);
  newFieldNames.forEach((fieldName, i) => {
    const newField = newFields[i];
    const isValid =
      newField &&
      supportedTypes.has(newField.type) &&
      newField.aggregatable &&
      (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms) &&
      (canAcceptScripted || !isScriptedField(newField));

    const arrayToPush = isValid ? validFields : invalidFields;
    arrayToPush.push(fieldName);
  });

  return {
    allFields: newFields,
    validFields,
    invalidFields,
  };
}
