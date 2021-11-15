/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import type { CoreStart } from 'kibana/public';
import { esQuery } from '../../../../../../../../src/plugins/data/public';
import { operationDefinitionMap } from '../index';
import { defaultLabel } from '../filters';
import { isReferenced } from '../../layer_helpers';

import type { FieldStatsResponse } from '../../../../../common';
import type { FrameDatasourceAPI } from '../../../../types';
import type { FiltersIndexPatternColumn } from '../index';
import type { TermsIndexPatternColumn } from './types';
import type { IndexPatternLayer, IndexPattern } from '../../../types';

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
        const fieldName = currentColumn.sourceField;
        const activeDataFieldNameMatch =
          frame.activeData?.[layerId].columns.find(({ id }) => id === columnId)?.meta.field ===
          fieldName;
        let currentTerms = uniq(
          frame.activeData?.[layerId].rows
            .map((row) => row[columnId] as string)
            .filter((term) => typeof term === 'string' && term !== '__other__') || []
        );
        if (!activeDataFieldNameMatch || currentTerms.length === 0) {
          const response: FieldStatsResponse<string | number> = await core.http.post(
            `/api/lens/index_stats/${indexPattern.id}/field`,
            {
              body: JSON.stringify({
                fieldName,
                dslQuery: esQuery.buildEsQuery(
                  indexPattern,
                  frame.query,
                  frame.filters,
                  esQuery.getEsQueryConfig(core.uiSettings)
                ),
                fromDate: frame.dateRange.fromDate,
                toDate: frame.dateRange.toDate,
                size: currentColumn.params.size,
              }),
            }
          );
          currentTerms = response.topValues?.buckets.map(({ key }) => String(key)) || [];
        }
        return {
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              label: i18n.translate('xpack.lens.indexPattern.pinnedTopValuesLabel', {
                defaultMessage: 'Filters of {field}',
                values: {
                  field: fieldName,
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
                          query: `${fieldName}: "${term}"`,
                          language: 'kuery',
                        },
                        label: term,
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

export function isSortableByColumn(layer: IndexPatternLayer, columnId: string) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    column.operationType !== 'last_value' &&
    !('references' in column) &&
    !isReferenced(layer, columnId)
  );
}
