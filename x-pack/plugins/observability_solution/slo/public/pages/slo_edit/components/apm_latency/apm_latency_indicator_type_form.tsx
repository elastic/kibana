/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFlexGroup, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { APMTransactionDurationIndicator } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useApmDefaultValues } from '../apm_common/use_apm_default_values';
import { DATA_VIEW_FIELD } from '../custom_common/index_selection';
import { GroupByField } from '../common/group_by_field';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useFetchApmIndex } from '../../../../hooks/use_fetch_apm_indices';
import { CreateSLOForm } from '../../types';
import { FieldSelector } from '../apm_common/field_selector';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';
import { formatAllFilters } from '../../helpers/format_filters';
import { getGroupByCardinalityFilters } from '../apm_common/get_group_by_cardinality_filters';

export function ApmLatencyIndicatorTypeForm() {
  const { control, watch, getFieldState } =
    useFormContext<CreateSLOForm<APMTransactionDurationIndicator>>();
  const { data: apmIndex } = useFetchApmIndex();

  const [
    serviceName = '',
    environment = '',
    transactionType = '',
    transactionName = '',
    globalFilters,
  ] = watch([
    'indicator.params.service',
    'indicator.params.environment',
    'indicator.params.transactionType',
    'indicator.params.transactionName',
    'indicator.params.filter',
  ]);
  const indicatorParamsFilters = getGroupByCardinalityFilters({
    serviceName,
    environment,
    transactionType,
    transactionName,
  });
  const allFilters = formatAllFilters(globalFilters, indicatorParamsFilters);

  useApmDefaultValues();

  const dataViewId = watch(DATA_VIEW_FIELD);

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: apmIndex,
    dataViewId,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          allowAllOption={false}
          label={i18n.translate('xpack.slo.sloEdit.apmLatency.serviceName', {
            defaultMessage: 'Service name',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.apmLatency.serviceName.placeholder', {
            defaultMessage: 'Select the APM service',
          })}
          fieldName="service.name"
          name="indicator.params.service"
          dataTestSubj="apmLatencyServiceSelector"
          tooltip={
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.apm.serviceName.tooltip', {
                defaultMessage: 'This is the APM service monitored by this SLO.',
              })}
              position="top"
            />
          }
        />
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.apmLatency.serviceEnvironment', {
            defaultMessage: 'Service environment',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.apmLatency.serviceEnvironment.placeholder',
            {
              defaultMessage: 'Select the environment',
            }
          )}
          fieldName="service.environment"
          name="indicator.params.environment"
          dataTestSubj="apmLatencyEnvironmentSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.apmLatency.transactionType', {
            defaultMessage: 'Transaction type',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.apmLatency.transactionType.placeholder', {
            defaultMessage: 'Select the transaction type',
          })}
          fieldName="transaction.type"
          name="indicator.params.transactionType"
          dataTestSubj="apmLatencyTransactionTypeSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.apmLatency.transactionName', {
            defaultMessage: 'Transaction name',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.apmLatency.transactionName.placeholder', {
            defaultMessage: 'Select the transaction name',
          })}
          fieldName="transaction.name"
          name="indicator.params.transactionName"
          dataTestSubj="apmLatencyTransactionNameSelector"
        />
      </EuiFlexGroup>

      <EuiFormRow
        label={
          <span>
            {i18n.translate('xpack.slo.sloEdit.apmLatency.threshold.placeholder', {
              defaultMessage: 'Threshold (ms)',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.apmLatency.threshold.tooltip', {
                defaultMessage:
                  'Configure the threshold in milliseconds defining the "good" or "successful" requests for the SLO.',
              })}
              position="top"
            />
          </span>
        }
        isInvalid={getFieldState('indicator.params.threshold').invalid}
      >
        <Controller
          name="indicator.params.threshold"
          control={control}
          defaultValue={250}
          rules={{
            required: true,
            min: 0,
          }}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiFieldNumber
              {...field}
              required
              isInvalid={fieldState.invalid}
              value={String(field.value)}
              data-test-subj="apmLatencyThresholdInput"
              min={0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            />
          )}
        />
      </EuiFormRow>

      <QueryBuilder
        dataTestSubj="apmLatencyFilterInput"
        dataView={dataView}
        label={i18n.translate('xpack.slo.sloEdit.apmLatency.filter', {
          defaultMessage: 'Query filter',
        })}
        name="indicator.params.filter"
        placeholder={i18n.translate('xpack.slo.sloEdit.apmLatency.filter.placeholder', {
          defaultMessage: 'Custom filter to apply on the index',
        })}
        tooltip={
          <EuiIconTip
            content={i18n.translate('xpack.slo.sloEdit.apm.filter.tooltip', {
              defaultMessage:
                'This KQL query is used to filter the APM metrics on some relevant criteria for this SLO.',
            })}
            position="top"
          />
        }
      />

      <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} filters={allFilters} />

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
