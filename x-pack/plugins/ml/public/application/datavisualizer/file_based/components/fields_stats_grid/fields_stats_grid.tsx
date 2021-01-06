/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, FC } from 'react';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';
import type { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';
import { DataVisualizerDataGrid, ItemIdToExpandedRowMap } from '../../../stats_datagrid';
import type { DataVisualizerFileBasedAppState } from '../../../../../../common/types/ml_url_generator';
import { usePageUrlState } from '../../../../util/url_state';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import { getFieldNames, getFieldType } from './get_field_names';
import type { FileBasedFieldVisConfig } from '../../../stats_datagrid/types/field_vis_config';
import { FileBasedDataVisualizerExpandedRow } from '../../../stats_datagrid/file_based_expanded_row';

function createFields(results: FindFileStructureResponse) {
  const {
    mappings,
    field_stats: fieldStats,
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  if (mappings && mappings.properties && fieldStats) {
    const fieldNames = getFieldNames(results);

    return fieldNames.map((name) => {
      if (fieldStats[name] !== undefined) {
        const field: FileBasedFieldVisConfig = {
          fieldName: name,
          type: ML_JOB_FIELD_TYPES.UNKNOWN,
        };
        const f = fieldStats[name];
        const m = mappings.properties[name];

        // sometimes the timestamp field is not in the mappings, and so our
        // collection of fields will be missing a time field with a type of date
        if (name === timestampField && field.type === undefined) {
          field.type = ML_JOB_FIELD_TYPES.DATE;
        }

        if (m !== undefined) {
          field.type = getFieldType(m.type);
          if (m.format !== undefined) {
            field.format = m.format;
          }
        }

        let _stats = {};

        // round min, max, median, mean to 2dp.
        if (f.median_value !== undefined) {
          _stats = {
            ..._stats,
            median: roundToDecimalPlace(f.median_value),
            mean: roundToDecimalPlace(f.mean_value),
            min: roundToDecimalPlace(f.min_value),
            max: roundToDecimalPlace(f.max_value),
          };
        }
        if (f.cardinality !== undefined) {
          _stats = {
            ..._stats,
            cardinality: f.cardinality,
            count: f.count,
            sampleCount: numMessagesAnalyzed,
          };
        }

        if (f.top_hits !== undefined) {
          if (field.type === ML_JOB_FIELD_TYPES.TEXT) {
            _stats = {
              ..._stats,
              examples: f.top_hits.map((hit) => hit.value),
            };
          } else {
            _stats = {
              ..._stats,
              topValues: f.top_hits.map((hit) => ({ key: hit.value, doc_count: hit.count })),
            };
          }
        }

        if (field.type === ML_JOB_FIELD_TYPES.DATE) {
          _stats = {
            ..._stats,
            earliest: f.earliest,
            latest: f.latest,
          };
        }

        field.stats = _stats;
        return field;
      } else {
        // field is not in the field stats
        // this could be the message field for a semi-structured log file or a
        // field which the endpoint has not been able to work out any information for
        const type =
          mappings.properties[name] && mappings.properties[name].type === ML_JOB_FIELD_TYPES.TEXT
            ? ML_JOB_FIELD_TYPES.TEXT
            : ML_JOB_FIELD_TYPES.UNKNOWN;

        return {
          fieldName: name,
          type,
          stats: {
            mean: 0,
            count: 0,
            sampleCount: numMessagesAnalyzed,
            cardinality: 0,
          },
        };
      }
    });
  }

  return [];
}
interface Props {
  results: FindFileStructureResponse;
}
export const getDefaultDataVisualizerListState = (): Required<DataVisualizerFileBasedAppState> => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'fieldName',
  sortDirection: 'asc',
});

function getItemIdToExpandedRowMap(
  itemIds: string[],
  items: FileBasedFieldVisConfig[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
    const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
    if (item !== undefined) {
      m[fieldName] = <FileBasedDataVisualizerExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

export const FieldsStatsGrid: FC<Props> = ({ results }) => {
  const restorableDefaults = getDefaultDataVisualizerListState();
  const [dataVisualizerListState, setDataVisualizerListState] = usePageUrlState(
    ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
    restorableDefaults
  );

  const items = useMemo(() => createFields(results), [results]);
  return (
    <DataVisualizerDataGrid
      items={items}
      pageState={dataVisualizerListState}
      updatePageState={setDataVisualizerListState}
      getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
    />
  );
};
