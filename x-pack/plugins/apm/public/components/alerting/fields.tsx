/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiExpression,
  EuiFieldNumber,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getEnvironmentLabel } from '../../../common/environment_filter_values';
import { EnvironmentsSelect } from '../shared/selects/environments_select';
import { ServiceNamesSelect } from '../shared/selects/service_names_select';
import { PopoverExpression } from './service_alert_trigger/popover_expression';

const ALL_OPTION = i18n.translate('xpack.apm.alerting.fields.all_option', {
  defaultMessage: 'All',
});

export function ServiceField({
  currentValue,
  onChange,
  environment,
  transactionType,
}: {
  currentValue?: string;
  environment?: string;
  onChange: (value: string) => void;
  transactionType?: string;
}) {
  return (
    <PopoverExpression
      value={currentValue || ALL_OPTION}
      title={i18n.translate('xpack.apm.alerting.fields.service', {
        defaultMessage: 'Service',
      })}
    >
      <ServiceNamesSelect
        compressed={true}
        defaultValue={currentValue}
        environment={environment}
        onChange={onChange}
        transactionType={transactionType}
      />
    </PopoverExpression>
  );
}

export function EnvironmentField({
  currentValue,
  onChange,
  serviceName,
  transactionType,
}: {
  currentValue: string;
  onChange: (value: string) => void;
  serviceName?: string;
  transactionType?: string;
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
        serviceName={serviceName}
      />
    </PopoverExpression>
  );
}

export function TransactionTypeField({
  currentValue,
  options,
  onChange,
}: {
  currentValue?: string;
  options?: EuiSelectOption[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const label = i18n.translate('xpack.apm.alerting.fields.type', {
    defaultMessage: 'Type',
  });

  if (!options || options.length <= 1) {
    return (
      <EuiExpression description={label} value={currentValue || ALL_OPTION} />
    );
  }

  return (
    <PopoverExpression value={currentValue} title={label}>
      <EuiSelect
        data-test-subj="transactionTypeField"
        defaultValue={currentValue}
        options={options}
        onChange={onChange}
        compressed
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
