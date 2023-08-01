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
  logs: i18n.translate('xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.logs', {
    defaultMessage: 'Logs',
  }),
  infrastructure: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.infrastructure',
    {
      defaultMessage: 'Metrics',
    }
  ),
  apm: i18n.translate('xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.apm', {
    defaultMessage: 'APM and User Experience',
  }),
  uptime: i18n.translate('xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.uptime', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  slo: i18n.translate('xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.slo', {
    defaultMessage: 'SLOs',
  }),
  stackAlerts: i18n.translate(
    'xpack.triggersActionsUI.sections.ruleFormConsumerSelectionModal.stackAlerts',
    {
      defaultMessage: 'Stack Rules',
    }
  ),
};

export type ValidConsumer = 'logs' | 'infrastructure' | 'apm' | 'uptime' | 'slo' | 'stackAlerts';

export const VALID_CONSUMERS = ['logs', 'infrastructure', 'apm', 'uptime', 'slo', 'stackAlerts'];

export interface RuleFormConsumerSelectionModalProps {
  consumers: ValidConsumer[];
  onSave: (consumer: string) => void;
  onCancel: () => void;
}

export const RuleFormConsumerSelectionModal = (props: RuleFormConsumerSelectionModalProps) => {
  const { consumers, onSave, onCancel } = props;
  const [selectedConsumer, setSelectedConsumer] = useState<string>('');

  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedConsumer(e.target.value);
    },
    [setSelectedConsumer]
  );

  const handleOnSave = useCallback(() => {
    onSave(selectedConsumer);
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
        return (a.value as string).localeCompare(b.value as string);
      });
  }, [consumers]);

  // Initialize dropdown with the first option
  useEffect(() => {
    if (!selectedConsumer && formattedSelectOptions.length) {
      setSelectedConsumer(formattedSelectOptions[0].value as string);
    }
  }, [selectedConsumer, formattedSelectOptions]);

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
