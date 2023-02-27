/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormLabel } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { useFetchApmIndex } from '../../../../hooks/slo/use_fetch_apm_indices';
import { FieldSelector } from '../common/field_selector';

export function ApmLatencyIndicatorTypeForm() {
  const { control, setValue } = useFormContext<CreateSLOInput>();
  const { data: apmIndex } = useFetchApmIndex();
  useEffect(() => {
    setValue('indicator.params.index', apmIndex);
  }, [apmIndex, setValue]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          allowAllOption={false}
          label={i18n.translate('xpack.observability.slos.sloEdit.apmLatency.serviceName', {
            defaultMessage: 'Service name',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.apmLatency.serviceName.placeholder',
            {
              defaultMessage: 'Select the APM service',
            }
          )}
          fieldName="service.name"
          name="indicator.params.service"
          dataTestSubj="apmLatencyServiceSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.observability.slos.sloEdit.apmLatency.serviceEnvironment', {
            defaultMessage: 'Service environment',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.apmLatency.serviceEnvironment.placeholder',
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
          label={i18n.translate('xpack.observability.slos.sloEdit.apmLatency.transactionType', {
            defaultMessage: 'Transaction type',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.apmLatency.transactionType.placeholder',
            {
              defaultMessage: 'Select the transaction type',
            }
          )}
          fieldName="transaction.type"
          name="indicator.params.transactionType"
          dataTestSubj="apmLatencyTransactionTypeSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.observability.slos.sloEdit.apmLatency.transactionName', {
            defaultMessage: 'Transaction name',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.apmLatency.transactionName.placeholder',
            {
              defaultMessage: 'Select the transaction name',
            }
          )}
          fieldName="transaction.name"
          name="indicator.params.transactionName"
          dataTestSubj="apmLatencyTransactionNameSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.apmLatency.threshold.placeholder', {
              defaultMessage: 'Threshold (ms)',
            })}
          </EuiFormLabel>
          <Controller
            shouldUnregister={true}
            name="indicator.params.threshold"
            control={control}
            defaultValue={250}
            rules={{
              required: true,
              min: 0,
            }}
            render={({ field: { ref, ...field } }) => (
              <EuiFieldNumber
                {...field}
                value={String(field.value)}
                data-test-subj="apmLatencyThresholdInput"
                min={0}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
