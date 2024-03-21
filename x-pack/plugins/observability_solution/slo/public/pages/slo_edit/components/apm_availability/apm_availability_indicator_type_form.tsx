/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { GroupByField } from '../common/group_by_field';
import { useFetchApmIndex } from '../../../../hooks/use_fetch_apm_indices';
import { CreateSLOForm } from '../../types';
import { FieldSelector } from '../apm_common/field_selector';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';

export function ApmAvailabilityIndicatorTypeForm() {
  const { watch, setValue } = useFormContext<CreateSLOForm>();
  const { data: apmIndex } = useFetchApmIndex();

  useEffect(() => {
    if (apmIndex !== '') {
      setValue('indicator.params.index', apmIndex);
    }
  }, [setValue, apmIndex]);

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: apmIndex,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          allowAllOption={false}
          label={i18n.translate('xpack.slo.sloEdit.apmAvailability.serviceName', {
            defaultMessage: 'Service name',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.apmAvailability.serviceName.placeholder', {
            defaultMessage: 'Select the APM service',
          })}
          fieldName="service.name"
          name="indicator.params.service"
          dataTestSubj="apmAvailabilityServiceSelector"
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
          label={i18n.translate('xpack.slo.sloEdit.apmAvailability.serviceEnvironment', {
            defaultMessage: 'Service environment',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.apmAvailability.serviceEnvironment.placeholder',
            {
              defaultMessage: 'Select the environment',
            }
          )}
          fieldName="service.environment"
          name="indicator.params.environment"
          dataTestSubj="apmAvailabilityEnvironmentSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.apmAvailability.transactionType', {
            defaultMessage: 'Transaction type',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.apmAvailability.transactionType.placeholder',
            {
              defaultMessage: 'Select the transaction type',
            }
          )}
          fieldName="transaction.type"
          name="indicator.params.transactionType"
          dataTestSubj="apmAvailabilityTransactionTypeSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.apmAvailability.transactionName', {
            defaultMessage: 'Transaction name',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.apmAvailability.transactionName.placeholder',
            {
              defaultMessage: 'Select the transaction name',
            }
          )}
          fieldName="transaction.name"
          name="indicator.params.transactionName"
          dataTestSubj="apmAvailabilityTransactionNameSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="apmLatencyFilterInput"
            indexPatternString={watch('indicator.params.index')}
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
        </EuiFlexItem>
      </EuiFlexGroup>

      <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} />

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
