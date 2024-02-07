/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText, EuiPanel } from '@elastic/eui';
import {
  RulesSettingsFlappingProperties,
  MIN_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_LOOK_BACK_WINDOW,
  MAX_STATUS_CHANGE_THRESHOLD,
} from '@kbn/alerting-plugin/common';
import { RulesSettingsRange } from '../rules_settings_range';

type OnChangeKey = keyof Omit<RulesSettingsFlappingProperties, 'enabled'>;

const lookBackWindowLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.flapping.lookBackWindowLabel',
  {
    defaultMessage: 'Rule run look back window',
  }
);

const lookBackWindowHelp = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.flapping.lookBackWindowHelp',
  {
    defaultMessage: 'The minimum number of runs in which the threshold must be met.',
  }
);

const statusChangeThresholdLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.flapping.statusChangeThresholdLabel',
  {
    defaultMessage: 'Alert status change threshold',
  }
);

const statusChangeThresholdHelp = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.flapping.statusChangeThresholdHelp',
  {
    defaultMessage:
      'The minimum number of times an alert must switch states in the look back window.',
  }
);

const getLookBackWindowLabelRuleRuns = (amount: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.rulesSettings.flapping.lookBackWindowLabelRuleRuns',
    {
      defaultMessage: '{amount, number} rule {amount, plural, one {run} other {runs}}',
      values: { amount },
    }
  );
};

const getStatusChangeThresholdRuleRuns = (amount: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.rulesSettings.flapping.statusChangeThresholdTimes',
    {
      defaultMessage: '{amount, number} {amount, plural, one {time} other {times}}',
      values: { amount },
    }
  );
};

export const RulesSettingsFlappingTitle = () => {
  return (
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesSettings.flapping.alertFlappingDetection"
          defaultMessage="Alert flapping detection"
        />
      </h5>
    </EuiTitle>
  );
};

export const RulesSettingsFlappingDescription = () => {
  return (
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="xpack.triggersActionsUI.rulesSettings.flapping.alertFlappingDetectionDescription"
        defaultMessage="Modify the frequency that an alert can go between active and recovered over a period of rule runs."
      />
    </EuiText>
  );
};

export interface RulesSettingsFlappingFormSectionProps {
  flappingSettings: RulesSettingsFlappingProperties;
  compressed?: boolean;
  onChange: (key: OnChangeKey, value: number) => void;
  canWrite: boolean;
}

export const RulesSettingsFlappingFormSection = memo(
  (props: RulesSettingsFlappingFormSectionProps) => {
    const { flappingSettings, compressed = false, onChange, canWrite } = props;

    const { lookBackWindow, statusChangeThreshold } = flappingSettings;

    return (
      <EuiFlexGroup direction="column">
        {compressed && (
          <>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <RulesSettingsFlappingTitle />
                </EuiFlexItem>
                <EuiFlexItem>
                  <RulesSettingsFlappingDescription />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <RulesSettingsRange
            data-test-subj="lookBackWindowRangeInput"
            min={MIN_LOOK_BACK_WINDOW}
            max={MAX_LOOK_BACK_WINDOW}
            value={lookBackWindow}
            onChange={(e) => onChange('lookBackWindow', parseInt(e.currentTarget.value, 10))}
            label={lookBackWindowLabel}
            labelPopoverText={lookBackWindowHelp}
            disabled={!canWrite}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RulesSettingsRange
            data-test-subj="statusChangeThresholdRangeInput"
            min={MIN_STATUS_CHANGE_THRESHOLD}
            max={MAX_STATUS_CHANGE_THRESHOLD}
            value={statusChangeThreshold}
            onChange={(e) => onChange('statusChangeThreshold', parseInt(e.currentTarget.value, 10))}
            label={statusChangeThresholdLabel}
            labelPopoverText={statusChangeThresholdHelp}
            disabled={!canWrite}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel borderRadius="none" color="subdued">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flapping.flappingSettingsDescription"
                defaultMessage="An alert is flapping if it changes status at least {statusChangeThreshold} in the last {lookBackWindow}."
                values={{
                  lookBackWindow: <b>{getLookBackWindowLabelRuleRuns(lookBackWindow)}</b>,
                  statusChangeThreshold: (
                    <b>{getStatusChangeThresholdRuleRuns(statusChangeThreshold)}</b>
                  ),
                }}
              />
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
