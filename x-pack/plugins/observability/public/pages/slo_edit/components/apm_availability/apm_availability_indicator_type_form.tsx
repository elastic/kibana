/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { useFetchApmIndex } from '../../../../hooks/slo/use_fetch_apm_indices';
import { FieldSelector } from '../apm_common/field_selector';
import { QueryBuilder } from '../common/query_builder';

export function ApmAvailabilityIndicatorTypeForm() {
  const { control, setValue, watch } = useFormContext<CreateSLOInput>();
  const { data: apmIndex } = useFetchApmIndex();
  useEffect(() => {
    setValue('indicator.params.index', apmIndex);
  }, [apmIndex, setValue]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          allowAllOption={false}
          label={i18n.translate('xpack.observability.slo.sloEdit.apmAvailability.serviceName', {
            defaultMessage: 'Service name',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.apmAvailability.serviceName.placeholder',
            {
              defaultMessage: 'Select the APM service',
            }
          )}
          fieldName="service.name"
          name="indicator.params.service"
          dataTestSubj="apmAvailabilityServiceSelector"
        />
        <FieldSelector
          label={i18n.translate(
            'xpack.observability.slo.sloEdit.apmAvailability.serviceEnvironment',
            {
              defaultMessage: 'Service environment',
            }
          )}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.apmAvailability.serviceEnvironment.placeholder',
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
          label={i18n.translate('xpack.observability.slo.sloEdit.apmAvailability.transactionType', {
            defaultMessage: 'Transaction type',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.apmAvailability.transactionType.placeholder',
            {
              defaultMessage: 'Select the transaction type',
            }
          )}
          fieldName="transaction.type"
          name="indicator.params.transactionType"
          dataTestSubj="apmAvailabilityTransactionTypeSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.observability.slo.sloEdit.apmAvailability.transactionName', {
            defaultMessage: 'Transaction name',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.apmAvailability.transactionName.placeholder',
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
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slo.sloEdit.apmAvailability.goodStatusCodes', {
              defaultMessage: 'Good status codes',
            })}
          </EuiFormLabel>
          <Controller
            shouldUnregister={true}
            name="indicator.params.goodStatusCodes"
            control={control}
            defaultValue={['2xx', '3xx', '4xx']}
            rules={{ required: true }}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiComboBox
                {...field}
                aria-label={i18n.translate(
                  'xpack.observability.slo.sloEdit.apmAvailability.goodStatusCodes.placeholder',
                  {
                    defaultMessage: 'Select the good status codes',
                  }
                )}
                placeholder={i18n.translate(
                  'xpack.observability.slo.sloEdit.apmAvailability.goodStatusCodes.placeholder',
                  {
                    defaultMessage: 'Select the good status codes',
                  }
                )}
                isInvalid={!!fieldState.error}
                options={generateStatusCodeOptions(['2xx', '3xx', '4xx', '5xx'])}
                selectedOptions={generateStatusCodeOptions(field.value)}
                onChange={(selected: EuiComboBoxOptionOption[]) => {
                  if (selected.length) {
                    return field.onChange(selected.map((opts) => opts.value));
                  }

                  field.onChange([]);
                }}
                isClearable={true}
                data-test-subj="sloEditApmAvailabilityGoodStatusCodesSelector"
              />
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryBuilder
            control={control}
            dataTestSubj="apmLatencyFilterInput"
            indexPatternString={watch('indicator.params.index')}
            label={i18n.translate('xpack.observability.slo.sloEdit.apmLatency.filter', {
              defaultMessage: 'Query filter',
            })}
            name="indicator.params.filter"
            placeholder={i18n.translate(
              'xpack.observability.slo.sloEdit.apmLatency.filter.placeholder',
              {
                defaultMessage: 'Custom filter to apply on the index',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

function generateStatusCodeOptions(codes: string[] = []) {
  return codes.map((code) => ({
    label: code,
    value: code,
    'data-test-subj': `${code}Option`,
  }));
}
