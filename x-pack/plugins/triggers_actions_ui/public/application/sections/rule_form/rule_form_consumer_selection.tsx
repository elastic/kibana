/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleCreationValidConsumer } from '../../../types';

const SELECT_LABEL: string = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.selectLabel',
  {
    defaultMessage: 'Select role visibility',
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
  AlertConsumers.APM,
  AlertConsumers.UPTIME,
  AlertConsumers.SLO,
  'stackAlerts',
];

export interface RuleFormConsumerSelectionProps {
  consumers: RuleCreationValidConsumer[];
  initialConsumer?: RuleCreationValidConsumer;
  onChange: (consumer: RuleCreationValidConsumer) => void;
}

export const RuleFormConsumerSelection = (props: RuleFormConsumerSelectionProps) => {
  const { consumers, initialConsumer, onChange } = props;
  const [selectedConsumer, setSelectedConsumer] = useState<RuleCreationValidConsumer>();

  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedConsumer(e.target.value as RuleCreationValidConsumer);
      onChange(e.target.value as RuleCreationValidConsumer);
    },
    [setSelectedConsumer, onChange]
  );

  const formattedSelectOptions: EuiSelectOption[] = useMemo(() => {
    return consumers
      .reduce<EuiSelectOption[]>((result, consumer) => {
        if (featureNameMap[consumer]) {
          result.push({
            value: consumer,
            text: featureNameMap[consumer],
          });
        }
        return result;
      }, [])
      .sort((a, b) => {
        return (a.value as RuleCreationValidConsumer).localeCompare(
          b.value as RuleCreationValidConsumer
        );
      });
  }, [consumers]);

  // Initialize dropdown with the initial consumer, otherwise the first option
  useEffect(() => {
    if (selectedConsumer || formattedSelectOptions.length === 0) {
      return;
    }

    if (
      initialConsumer &&
      formattedSelectOptions.find((option) => option.value === initialConsumer)
    ) {
      setSelectedConsumer(initialConsumer);
      onChange(initialConsumer);
      return;
    }

    const firstConsumer = formattedSelectOptions[0].value as RuleCreationValidConsumer;
    setSelectedConsumer(firstConsumer);
    onChange(firstConsumer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConsumer, formattedSelectOptions, initialConsumer]);

  if (formattedSelectOptions.length <= 1) {
    return null;
  }

  return (
    <EuiFormRow fullWidth label={SELECT_LABEL}>
      <EuiSelect
        fullWidth
        hasNoInitialSelection
        value={selectedConsumer}
        onChange={handleOnChange}
        options={formattedSelectOptions}
        data-test-subj="ruleFormConsumerSelect"
      />
    </EuiFormRow>
  );
};
