/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  EuiConfirmModal,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleCreationValidConsumer } from '../../../types';

const consumerSelectionModalTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.title',
  {
    defaultMessage: 'Select rule association',
  }
);

const consumerSelectionModalDescription = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.description',
  {
    defaultMessage:
      'This rule needs to be associated with a particular application for proper role access visibility.',
  }
);

const consumerSelectionModalSave = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.save',
  {
    defaultMessage: 'Save',
  }
);

const consumerSelectionModalCancel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.cancel',
  {
    defaultMessage: 'Cancel',
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
  discover: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.discover',
    {
      defaultMessage: 'Discover',
    }
  ),
};

export const VALID_CONSUMERS = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.APM,
  AlertConsumers.UPTIME,
  AlertConsumers.SLO,
  'stackAlerts',
  // We need to include discover because discover is a valid consumer for the esquery rule
  'discover',
];

export interface RuleFormConsumerSelectionModalProps {
  consumers: RuleCreationValidConsumer[];
  initialConsumer?: RuleCreationValidConsumer;
  onChange: (consumer: RuleCreationValidConsumer) => void;
  onSave: (consumer: RuleCreationValidConsumer) => void;
  onCancel: () => void;
}

export const RuleFormConsumerSelectionModal = (props: RuleFormConsumerSelectionModalProps) => {
  const { consumers, initialConsumer, onSave, onCancel, onChange } = props;
  const [selectedConsumer, setSelectedConsumer] = useState<RuleCreationValidConsumer>();

  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedConsumer(e.target.value as RuleCreationValidConsumer);
      onChange(e.target.value as RuleCreationValidConsumer);
    },
    [setSelectedConsumer, onChange]
  );

  const handleOnSave = useCallback(() => {
    if (selectedConsumer) {
      onSave(selectedConsumer);
    }
  }, [selectedConsumer, onSave]);

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

  return (
    <EuiConfirmModal
      maxWidth={500}
      confirmButtonDisabled={!!!selectedConsumer}
      title={consumerSelectionModalTitle}
      confirmButtonText={consumerSelectionModalSave}
      cancelButtonText={consumerSelectionModalCancel}
      onConfirm={handleOnSave}
      onCancel={onCancel}
      defaultFocusedButton="confirm"
      data-test-subj="ruleFormConsumerSelectionModal"
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText>
            <p>{consumerSelectionModalDescription}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            fullWidth
            hasNoInitialSelection
            value={selectedConsumer}
            onChange={handleOnChange}
            options={formattedSelectOptions}
            data-test-subj="ruleFormConsumerSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
