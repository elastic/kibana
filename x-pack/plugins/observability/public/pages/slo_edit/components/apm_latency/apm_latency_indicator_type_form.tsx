/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { FieldSelector } from './field_selector';

export interface Props {
  control: Control<CreateSLOInput>;
}

export function ApmLatencyIndicatorTypeForm({ control }: Props) {
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
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
          dataTestSubj="apmLatencyTransactionNameSelector"
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
