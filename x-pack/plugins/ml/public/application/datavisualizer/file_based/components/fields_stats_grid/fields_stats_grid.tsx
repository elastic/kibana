/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, FC, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';
import type { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';
import { DataVisualizerDataGrid, ItemIdToExpandedRowMap } from '../../../stats_datagrid';
import type { DataVisualizerFileBasedAppState } from '../../../../../../common/types/ml_url_generator';
import { getFieldNames, getSupportedFieldType } from './get_field_names';
import type { FileBasedFieldVisConfig } from '../../../stats_datagrid/types/field_vis_config';
import { FileBasedDataVisualizerExpandedRow } from '../../../stats_datagrid/file_based_expanded_row';

import { DataVisualizerFieldNamesFilter } from '../field_names_filter';
import { DataVisualizerFieldTypesFilter } from '../field_types_filter';

function createFields(results: FindFileStructureResponse) {
  const {
    mappings,
    field_stats: fieldStats,
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  let numericFieldsCount = 0;

  if (mappings && mappings.properties && fieldStats) {
    const fieldNames = getFieldNames(results);

    const items = fieldNames.map((name) => {
      if (fieldStats[name] !== undefined) {
        const field: FileBasedFieldVisConfig = {
          fieldName: name,
          type: ML_JOB_FIELD_TYPES.UNKNOWN,
        };
        const f = fieldStats[name];
        const m = mappings.properties[name];

        // sometimes the timestamp field is not in the mappings, and so our
        // collection of fields will be missing a time field with a type of date
        if (name === timestampField && field.type === ML_JOB_FIELD_TYPES.UNKNOWN) {
          field.type = ML_JOB_FIELD_TYPES.DATE;
        }

        if (m !== undefined) {
          field.type = getSupportedFieldType(m.type);
          if (field.type === ML_JOB_FIELD_TYPES.NUMBER) {
            numericFieldsCount += 1;
          }
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

    return {
      fields: items,
      totalFieldsCount: items.length,
      totalMetricFieldsCount: numericFieldsCount,
    };
  }

  return { fields: [], totalFieldsCount: 0, totalMetricFieldsCount: 0 };
}

function filterFields(
  fields: Array<
    | FileBasedFieldVisConfig
    | {
        fieldName: string;
        type: 'text' | 'unknown';
        stats: { mean: number; count: number; sampleCount: number; cardinality: number };
      }
  >,
  visibleFieldNames: string[],
  visibleFieldTypes: string[]
) {
  let items = fields;

  if (visibleFieldTypes && visibleFieldTypes.length > 0) {
    items = items.filter(
      (config) => visibleFieldTypes.findIndex((field) => field === config.type) > -1
    );
  }
  if (visibleFieldNames && visibleFieldNames.length > 0) {
    items = items.filter((config) => {
      return visibleFieldNames.findIndex((field) => field === config.fieldName) > -1;
    });
  }

  return {
    filteredFields: items,
    visibleFieldsCount: items.length,
    visibleMetricsCount: items.filter((d) => d.type === ML_JOB_FIELD_TYPES.NUMBER).length,
  };
}

interface Props {
  results: FindFileStructureResponse;
}
export const getDefaultDataVisualizerListState = (): Required<DataVisualizerFileBasedAppState> => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
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
  const [
    dataVisualizerListState,
    setDataVisualizerListState,
  ] = useState<DataVisualizerFileBasedAppState>(restorableDefaults);
  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;
  const setVisibleFieldTypes = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldTypes: values });
  };

  const visibleFieldNames =
    dataVisualizerListState.visibleFieldNames ?? restorableDefaults.visibleFieldNames;
  const setVisibleFieldNames = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldNames: values });
  };

  const { fields, totalFieldsCount, totalMetricFieldsCount } = useMemo(
    () => createFields(results),
    [results, visibleFieldNames, visibleFieldTypes]
  );
  const { filteredFields, visibleFieldsCount, visibleMetricsCount } = useMemo(
    () => filterFields(fields, visibleFieldNames, visibleFieldTypes),
    [results, visibleFieldNames, visibleFieldTypes]
  );

  const fieldsCountStats = { visibleFieldsCount, totalFieldsCount };
  const metricsStats = { visibleMetricsCount, totalMetricFieldsCount };

  return (
    <div>
      <EuiSpacer size="m" />

      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        style={{ marginLeft: 4 }}
        data-test-subj="mlDataVisualizerFieldCountPanel"
      >
        {fieldsCountStats && (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            style={{ maxWidth: 250 }}
            data-test-subj="mlDataVisualizerFieldsSummary"
          >
            <EuiFlexItem grow={false}>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.ml.dataVisualizer.searchPanel.allFieldsLabel"
                    defaultMessage="All fields"
                  />
                </h5>
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiNotificationBadge
                color="subdued"
                size="m"
                data-test-subj="mlDataVisualizerVisibleFieldsCount"
              >
                <strong>{fieldsCountStats.visibleFieldsCount}</strong>
              </EuiNotificationBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s" data-test-subj="mlDataVisualizerTotalFieldsCount">
                <FormattedMessage
                  id="xpack.ml.dataVisualizer.searchPanel.ofFieldsTotal"
                  defaultMessage="of {totalCount} total"
                  values={{ totalCount: fieldsCountStats.totalFieldsCount }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {metricsStats && (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            style={{ maxWidth: 250 }}
            data-test-subj="mlDataVisualizerMetricFieldsSummary"
          >
            <EuiFlexItem grow={false}>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.ml.dataVisualizer.searchPanel.numberFieldsLabel"
                    defaultMessage="Number fields"
                  />
                </h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge
                color="subdued"
                size="m"
                data-test-subj="mlDataVisualizerVisibleMetricFieldsCount"
              >
                <strong>{metricsStats.visibleMetricsCount}</strong>
              </EuiNotificationBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s" data-test-subj="mlDataVisualizerMetricFieldsCount">
                <FormattedMessage
                  id="xpack.ml.dataVisualizer.searchPanel.ofFieldsTotal"
                  defaultMessage="of {totalCount} total"
                  values={{ totalCount: metricsStats.totalMetricFieldsCount }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiFlexItem style={{ alignItems: 'flex-end' }}>
          <EuiFlexGroup gutterSize="xs" data-test-subj="mlDataVisualizerFieldCountPanel">
            <DataVisualizerFieldNamesFilter
              fields={fields}
              setVisibleFieldNames={setVisibleFieldNames}
              visibleFieldNames={visibleFieldNames}
            />
            <DataVisualizerFieldTypesFilter
              fields={fields}
              setVisibleFieldTypes={setVisibleFieldTypes}
              visibleFieldTypes={visibleFieldTypes}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DataVisualizerDataGrid<FileBasedFieldVisConfig>
        items={filteredFields}
        pageState={dataVisualizerListState}
        updatePageState={setDataVisualizerListState}
        getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
      />
    </div>
  );
};
