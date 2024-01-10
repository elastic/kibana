/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertConsumers, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
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
  onChange: (consumer: RuleCreationValidConsumer | null) => void;
  errors: IErrorObject;
  selectedConsumer?: RuleCreationValidConsumer | null;
  /* FUTURE ENGINEER
   * if this prop is set to null then we wont initialize the value and the user will have to set it
   * if this prop is set to a valid consumers then we will set it up to what was passed
   * if this prop is not valid or undefined but the valid consumers has stackAlerts then we will default it to stackAlerts
   */
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
}

const SINGLE_SELECTION = { asPlainText: true };

export const RuleFormConsumerSelection = (props: RuleFormConsumerSelectionProps) => {
  const { consumers, errors, onChange, selectedConsumer, initialSelectedConsumer } = props;
  const isInvalid = errors?.consumer?.length > 0;
  const handleOnChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>>) => {
      if (selected.length > 0) {
        const newSelectedConsumer = selected[0];
        onChange(newSelectedConsumer.value!);
      } else {
        onChange(null);
      }
    },
    [onChange]
  );
  const validatedSelectedConsumer = useMemo(() => {
    if (
      selectedConsumer &&
      consumers.includes(selectedConsumer) &&
      featureNameMap[selectedConsumer]
    ) {
      return selectedConsumer;
    }
    return null;
  }, [selectedConsumer, consumers]);
  const selectedOptions = useMemo(
    () =>
      validatedSelectedConsumer
        ? [{ value: validatedSelectedConsumer, label: featureNameMap[validatedSelectedConsumer] }]
        : [],
    [validatedSelectedConsumer]
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
    // At initialization, select initialSelectedConsumer or the first value
    if (!validatedSelectedConsumer) {
      if (initialSelectedConsumer === null) {
        return;
      } else if (initialSelectedConsumer && consumers.includes(initialSelectedConsumer)) {
        onChange(initialSelectedConsumer);
        return;
      } else if (consumers.includes(STACK_ALERTS_FEATURE_ID)) {
        onChange(STACK_ALERTS_FEATURE_ID);
        return;
      }
      onChange(consumers[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (consumers.length === 1) {
      onChange(consumers[0] as RuleCreationValidConsumer);
    } else if (consumers.includes(AlertConsumers.OBSERVABILITY)) {
      onChange(AlertConsumers.OBSERVABILITY as RuleCreationValidConsumer);
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
        singleSelection={SINGLE_SELECTION}
        options={formattedSelectOptions}
        selectedOptions={selectedOptions}
        onChange={handleOnChange}
      />
    </EuiFormRow>
  );
};
