/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { IndexAndTimestampField } from '../custom_common/index_and_timestamp_field';
import { GroupByField } from '../common/group_by_field';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';
import { DATA_VIEW_FIELD } from '../custom_common/index_selection';

export function CustomKqlIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');
  const dataViewId = watch(DATA_VIEW_FIELD);

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: index,
    dataViewId,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <IndexAndTimestampField dataView={dataView} isLoading={isIndexFieldsLoading} />

      <EuiFlexItem>
        <QueryBuilder
          dataTestSubj="customKqlIndicatorFormQueryFilterInput"
          dataView={dataView}
          label={i18n.translate('xpack.slo.sloEdit.sliType.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
          name="indicator.params.filter"
          placeholder={i18n.translate('xpack.slo.sloEdit.sliType.customKql.customFilter', {
            defaultMessage: 'Custom filter to apply on the index',
          })}
          tooltip={
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.sliType.customKql.customFilter.tooltip', {
                defaultMessage:
                  'This KQL query can be used to filter the documents with some relevant criteria.',
              })}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          dataTestSubj="customKqlIndicatorFormGoodQueryInput"
          dataView={dataView}
          label={i18n.translate('xpack.slo.sloEdit.sliType.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
          name="indicator.params.good"
          placeholder={i18n.translate('xpack.slo.sloEdit.sliType.customKql.goodQueryPlaceholder', {
            defaultMessage: 'Define the good events',
          })}
          required
          tooltip={
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.sliType.customKql.goodQuery.tooltip', {
                defaultMessage:
                  'This KQL query should return a subset of events that are considered "good" or "successful" for the purpose of calculating the SLO. The query should filter events based on some relevant criteria, such as status codes, error messages, or other relevant fields.',
              })}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          dataTestSubj="customKqlIndicatorFormTotalQueryInput"
          dataView={dataView}
          label={i18n.translate('xpack.slo.sloEdit.sliType.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
          name="indicator.params.total"
          placeholder={i18n.translate('xpack.slo.sloEdit.sliType.customKql.totalQueryPlaceholder', {
            defaultMessage: 'Define the total events',
          })}
          tooltip={
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.sliType.customKql.totalQuery.tooltip', {
                defaultMessage:
                  'This KQL query should return all events that are relevant to the SLO calculation, including both good and bad events.',
              })}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} />

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
