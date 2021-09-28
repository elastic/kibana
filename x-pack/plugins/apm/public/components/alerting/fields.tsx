/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { SuggestionsSelect } from '../shared/suggestions_select';
import { PopoverExpression } from './service_alert_trigger/popover_expression';

const allOptionText = i18n.translate('xpack.apm.alerting.fields.allOption', {
  defaultMessage: 'All',
});
const allOption: EuiComboBoxOptionOption<string> = {
  label: allOptionText,
  value: allOptionText,
};
const environmentAllOption: EuiComboBoxOptionOption<string> = {
  label: ENVIRONMENT_ALL.text,
  value: ENVIRONMENT_ALL.value,
};

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
      value={currentValue || allOption.value}
      title={i18n.translate('xpack.apm.alerting.fields.service', {
        defaultMessage: 'Service',
      })}
    >
      <SuggestionsSelect
        allOption={allowAll ? allOption : undefined}
        customOptionText={i18n.translate(
          'xpack.apm.serviceNamesSelectCustomOptionText',
          {
            defaultMessage: 'Add \\{searchValue\\} as a new service name',
          }
        )}
        defaultValue={currentValue}
        field={SERVICE_NAME}
        onChange={onChange}
        placeholder={i18n.translate('xpack.apm.serviceNamesSelectPlaceholder', {
          defaultMessage: 'Select service name',
        })}
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
      <SuggestionsSelect
        allOption={environmentAllOption}
        customOptionText={i18n.translate(
          'xpack.apm.environmentsSelectCustomOptionText',
          {
            defaultMessage: 'Add \\{searchValue\\} as a new environment',
          }
        )}
        defaultValue={getEnvironmentLabel(currentValue)}
        field={SERVICE_ENVIRONMENT}
        onChange={onChange}
        placeholder={i18n.translate('xpack.apm.environmentsSelectPlaceholder', {
          defaultMessage: 'Select environment',
        })}
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
    <PopoverExpression value={currentValue || allOption.value} title={label}>
      <SuggestionsSelect
        allOption={allOption}
        customOptionText={i18n.translate(
          'xpack.apm.transactionTypesSelectCustomOptionText',
          {
            defaultMessage: 'Add \\{searchValue\\} as a new transaction type',
          }
        )}
        defaultValue={currentValue}
        field={TRANSACTION_TYPE}
        onChange={onChange}
        placeholder={i18n.translate(
          'xpack.apm.transactionTypesSelectPlaceholder',
          {
            defaultMessage: 'Select transaction type',
          }
        )}
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
