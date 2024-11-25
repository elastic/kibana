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
import { IndexAndTimestampField } from '../custom_common/index_and_timestamp_field';
import { useKibana } from '../../../../hooks/use_kibana';
import { GroupByField } from '../common/group_by_field';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';
import { DATA_VIEW_FIELD } from '../custom_common/index_selection';
import { MetricIndicator } from './metric_indicator';
import { COMPARATOR_MAPPING } from '../../constants';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';

export { NEW_TIMESLICE_METRIC } from './metric_indicator';

export function TimesliceMetricIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');
  const dataViewId = watch(DATA_VIEW_FIELD);

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: index,
    dataViewId,
  });

  const { uiSettings } = useKibana().services;
  const threshold = watch('indicator.params.metric.threshold');
  const comparator = watch('indicator.params.metric.comparator');
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage id="xpack.slo.sloEdit.sliType.sourceTitle" defaultMessage="Source" />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="l">
        <IndexAndTimestampField dataView={dataView} isLoading={isIndexFieldsLoading} />

        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="timesliceMetricIndicatorFormQueryFilterInput"
            dataView={dataView}
            label={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.queryFilter', {
              defaultMessage: 'Query filter',
            })}
            name="indicator.params.filter"
            placeholder={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.customFilter', {
              defaultMessage: 'Custom filter to apply on the index',
            })}
            tooltip={
              <EuiIconTip
                content={i18n.translate(
                  'xpack.slo.sloEdit.sliType.timesliceMetric.customFilter.tooltip',
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
                id="xpack.slo.sloEdit.sliType.timesliceMetric.metricTitle"
                defaultMessage="Metric definition"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <MetricIndicator
            indexFields={dataView?.fields ?? []}
            isLoadingIndex={isIndexFieldsLoading}
            dataView={dataView}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>

        <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} />

        <DataPreviewChart
          formatPattern={uiSettings.get('format:number:defaultPattern')}
          threshold={threshold}
          thresholdDirection={['GT', 'GTE'].includes(comparator) ? 'above' : 'below'}
          thresholdColor={euiTheme.colors.warning}
          thresholdMessage={`${COMPARATOR_MAPPING[comparator]} ${threshold}`}
          ignoreMoreThan100
        />
      </EuiFlexGroup>
    </>
  );
}
