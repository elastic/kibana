/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { IErrorObject, RuleCreationValidConsumer } from '../../../types';

const SELECT_LABEL: string = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.selectLabel',
  {
    defaultMessage: 'Role visibility',
  }
);

const featureNameMap: Record<string, string> = {
  [AlertConsumers.LOGS]: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.logs',
    {
      defaultMessage: 'Logs',
    }
  ),
  [AlertConsumers.INFRASTRUCTURE]: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.infrastructure',
    {
      defaultMessage: 'Metrics',
    }
  ),
  [AlertConsumers.APM]: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.apm',
    {
      defaultMessage: 'APM and User Experience',
    }
  ),
  [AlertConsumers.UPTIME]: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.uptime',
    {
      defaultMessage: 'Synthetics and Uptime',
    }
  ),
  [AlertConsumers.SLO]: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.slo',
    {
      defaultMessage: 'SLOs',
    }
  ),
  stackAlerts: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.stackAlerts',
    {
      defaultMessage: 'Stack Rules',
    }
  ),
};

export const VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  'stackAlerts',
  'alerts',
];

export interface RuleFormConsumerSelectionProps {
  consumers: RuleCreationValidConsumer[];
  onChange: (consumer: RuleCreationValidConsumer[] | null) => void;
  errors: IErrorObject;
  selectedConsumers?: RuleCreationValidConsumer[] | null;
}

export const RuleFormConsumerSelection = (props: RuleFormConsumerSelectionProps) => {
  const { consumers, errors, onChange, selectedConsumers } = props;
  const isInvalid = errors?.consumer?.length > 0;
  const handleOnChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>>) => {
      if (selected.length > 0) {
        onChange(selected.map((consume) => consume.value!));
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  const validatedSelectedConsumers = useMemo(() => {
    if (selectedConsumers) {
      return selectedConsumers.filter((consumer) => {
        return consumers.includes(consumer) && featureNameMap[consumer];
      });
    }
    return null;
  }, [selectedConsumers, consumers]);

  const selectedOptions = useMemo(
    () =>
      validatedSelectedConsumers
        ? validatedSelectedConsumers.map((consumer) => ({
            value: consumer,
            label: featureNameMap[consumer],
          }))
        : [],
    [validatedSelectedConsumers]
  );

  const formattedSelectOptions: Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>> =
    useMemo(() => {
      return consumers
        .reduce<Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>>>((result, consumer) => {
          if (featureNameMap[consumer]) {
            result.push({
              value: consumer,
              'data-test-subj': consumer,
              label: featureNameMap[consumer],
            });
          }
          return result;
        }, [])
        .sort((a, b) => {
          return a.value!.localeCompare(b.value!);
        });
    }, [consumers]);

  useEffect(() => {
    // At initialization, select all possible consumers as the first value
    if (!validatedSelectedConsumers) {
      onChange(consumers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (consumers.length > 1) {
      onChange(consumers.filter((c) => c !== AlertConsumers.OBSERVABILITY && c !== 'alerts')); // hack
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumers]);

  if (consumers.length <= 1 || consumers.includes(AlertConsumers.OBSERVABILITY)) {
    return null;
  }

  return (
    <EuiFormRow fullWidth label={SELECT_LABEL} isInvalid={isInvalid} error={errors?.consumer ?? ''}>
      <EuiComboBox
        data-test-subj="ruleFormConsumerSelect"
        aria-label={i18n.translate(
          'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.comboBox.ariaLabel',
          {
            defaultMessage: 'Select a scope',
          }
        )}
        placeholder={i18n.translate(
          'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.comboBox.placeholder',
          {
            defaultMessage: 'Select a scope',
          }
        )}
        fullWidth
        options={formattedSelectOptions}
        selectedOptions={selectedOptions}
        onChange={handleOnChange}
      />
    </EuiFormRow>
  );
};
