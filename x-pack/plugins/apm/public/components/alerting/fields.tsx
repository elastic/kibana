/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect, EuiExpression, EuiFieldNumber } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelectOption } from '@elastic/eui';
import { getEnvironmentLabel } from '../../../common/environment_filter_values';
import { PopoverExpression } from './ServiceAlertTrigger/PopoverExpression';

const ALL_OPTION = i18n.translate('xpack.apm.alerting.fields.all_option', {
  defaultMessage: 'All',
});

export function ServiceField({ value }: { value?: string }) {
  return (
    <EuiExpression
      description={i18n.translate('xpack.apm.alerting.fields.service', {
        defaultMessage: 'Service',
      })}
      value={value || ALL_OPTION}
    />
  );
}

export function EnvironmentField({
  currentValue,
  options,
  onChange,
}: {
  currentValue: string;
  options: EuiSelectOption[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <PopoverExpression
      value={getEnvironmentLabel(currentValue)}
      title={i18n.translate('xpack.apm.alerting.fields.environment', {
        defaultMessage: 'Environment',
      })}
    >
      <EuiSelect
        defaultValue={currentValue}
        options={options}
        onChange={onChange}
        compressed
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
