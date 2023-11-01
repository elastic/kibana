/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ALL_VALUE } from '@kbn/slo-schema/src/schema/common';
import { useFetchIndexPatternFields } from '../../../../hooks/slo/use_fetch_index_pattern_fields';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { IndexFieldSelector } from '../common/index_field_selector';
import { QueryBuilder } from '../common/query_builder';
import { IndexSelection } from '../custom_common/index_selection';
import { MetricIndicator } from './metric_indicator';
import { useKibana } from '../../../../utils/kibana_react';
import { COMPARATOR_MAPPING } from '../../constants';

export { NEW_TIMESLICE_METRIC } from './metric_indicator';

export function TimesliceMetricIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');
  const { isLoading: isIndexFieldsLoading, data: indexFields = [] } =
    useFetchIndexPatternFields(index);
  const timestampFields = indexFields.filter((field) => field.type === 'date');
  const partitionByFields = indexFields.filter((field) => field.aggregatable);
  const { uiSettings } = useKibana().services;
  const threshold = watch('indicator.params.metric.threshold');
  const comparator = watch('indicator.params.metric.comparator');
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.observability.slo.sloEdit.sliType.sourceTitle"
            defaultMessage="Source"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="row" gutterSize="l">
          <EuiFlexItem>
            <IndexSelection />
          </EuiFlexItem>
          <EuiFlexItem>
            <IndexFieldSelector
              indexFields={timestampFields}
              name="indicator.params.timestampField"
              label={i18n.translate('xpack.observability.slo.sloEdit.timestampField.label', {
                defaultMessage: 'Timestamp field',
              })}
              placeholder={i18n.translate(
                'xpack.observability.slo.sloEdit.timestampField.placeholder',
                { defaultMessage: 'Select a timestamp field' }
              )}
              isLoading={!!index && isIndexFieldsLoading}
              isDisabled={!index}
              isRequired
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="timesliceMetricIndicatorFormQueryFilterInput"
            indexPatternString={watch('indicator.params.index')}
            label={i18n.translate(
              'xpack.observability.slo.sloEdit.sliType.timesliceMetric.queryFilter',
              {
                defaultMessage: 'Query filter',
              }
            )}
            name="indicator.params.filter"
            placeholder={i18n.translate(
              'xpack.observability.slo.sloEdit.sliType.timesliceMetric.customFilter',
              { defaultMessage: 'Custom filter to apply on the index' }
            )}
            tooltip={
              <EuiIconTip
                content={i18n.translate(
                  'xpack.observability.slo.sloEdit.sliType.timesliceMetric.customFilter.tooltip',
                  {
                    defaultMessage:
                      'This KQL query can be used to filter the documents with some relevant criteria.',
                  }
                )}
                position="top"
              />
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.observability.slo.sloEdit.sliType.timesliceMetric.metricTitle"
                defaultMessage="Metric definition"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <MetricIndicator indexFields={indexFields} isLoadingIndex={isIndexFieldsLoading} />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>

        <IndexFieldSelector
          indexFields={partitionByFields}
          name="groupBy"
          defaultValue={ALL_VALUE}
          label={
            <span>
              {i18n.translate('xpack.observability.slo.sloEdit.groupBy.label', {
                defaultMessage: 'Partition by',
              })}{' '}
              <EuiIconTip
                content={i18n.translate('xpack.observability.slo.sloEdit.groupBy.tooltip', {
                  defaultMessage: 'Create individual SLOs for each value of the selected field.',
                })}
                position="top"
              />
            </span>
          }
          placeholder={i18n.translate('xpack.observability.slo.sloEdit.groupBy.placeholder', {
            defaultMessage: 'Select an optional field to partition by',
          })}
          isLoading={!!index && isIndexFieldsLoading}
          isDisabled={!index}
        />

        <DataPreviewChart
          formatPattern={uiSettings.get('format:number:defaultPattern')}
          threshold={threshold}
          thresholdDirection={['GT', 'GTE'].includes(comparator) ? 'above' : 'below'}
          thresholdColor={euiTheme.colors.warning}
          thresholdMessage={`${COMPARATOR_MAPPING[comparator]} ${threshold}`}
        />
      </EuiFlexGroup>
    </>
  );
}
