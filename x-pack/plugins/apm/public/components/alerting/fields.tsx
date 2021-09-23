/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getEnvironmentLabel } from '../../../common/environment_filter_values';
import { EnvironmentsSelect } from '../shared/selects/environments_select';
import { ServiceNamesSelect } from '../shared/selects/service_names_select';
import { TransactionTypesSelect } from '../shared/selects/transaction_types_select';
import { PopoverExpression } from './service_alert_trigger/popover_expression';

const ALL_OPTION = i18n.translate('xpack.apm.alerting.fields.all_option', {
  defaultMessage: 'All',
});

export function ServiceField({
  allowAll = true,
  currentValue,
  onChange,
}: {
  allowAll?: boolean;
  currentValue?: string;
  onChange: (value?: string) => void;
}) {
  return (
    <PopoverExpression
      value={currentValue || ALL_OPTION}
      title={i18n.translate('xpack.apm.alerting.fields.service', {
        defaultMessage: 'Service',
      })}
    >
      <ServiceNamesSelect
        allowAll={allowAll}
        compressed={true}
        defaultValue={currentValue}
        onChange={onChange}
      />
    </PopoverExpression>
  );
}

export function EnvironmentField({
  currentValue,
  onChange,
}: {
  currentValue: string;
  onChange: (value?: string) => void;
}) {
  return (
    <PopoverExpression
      value={getEnvironmentLabel(currentValue)}
      title={i18n.translate('xpack.apm.alerting.fields.environment', {
        defaultMessage: 'Environment',
      })}
    >
      <EnvironmentsSelect
        compressed={true}
        defaultValue={currentValue}
        onChange={onChange}
      />
    </PopoverExpression>
  );
}

export function TransactionTypeField({
  currentValue,
  onChange,
}: {
  currentValue?: string;
  onChange: (value?: string) => void;
}) {
  const label = i18n.translate('xpack.apm.alerting.fields.type', {
    defaultMessage: 'Type',
  });
  return (
    <PopoverExpression value={currentValue || ALL_OPTION} title={label}>
      <TransactionTypesSelect
        compressed={true}
        defaultValue={currentValue}
        onChange={onChange}
      />
    </PopoverExpression>
  );
}

export function IsAboveField({
  value,
  unit,
  onChange,
  step,
}: {
  value: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <PopoverExpression
      value={value ? `${value.toString()}${unit}` : ''}
      title={i18n.translate(
        'xpack.apm.transactionErrorRateAlertTrigger.isAbove',
        { defaultMessage: 'is above' }
      )}
    >
      <EuiFieldNumber
        value={value ?? ''}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        append={unit}
        compressed
        step={step}
      />
    </PopoverExpression>
  );
}
