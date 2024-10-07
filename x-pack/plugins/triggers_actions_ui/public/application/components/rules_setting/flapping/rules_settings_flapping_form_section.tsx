/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText, EuiPanel } from '@elastic/eui';
import { RuleSettingsFlappingInputs } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_inputs';
import { RuleSettingsFlappingMessage } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_message';
import { RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common';

type OnChangeKey = keyof Omit<RulesSettingsFlappingProperties, 'enabled'>;

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
        <EuiFlexItem>
          <RuleSettingsFlappingInputs
            lookBackWindow={lookBackWindow}
            statusChangeThreshold={statusChangeThreshold}
            isDisabled={!canWrite}
            onLookBackWindowChange={(value) => onChange('lookBackWindow', value)}
            onStatusChangeThresholdChange={(value) => onChange('statusChangeThreshold', value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel borderRadius="none" color="subdued">
            <RuleSettingsFlappingMessage
              lookBackWindow={lookBackWindow}
              statusChangeThreshold={statusChangeThreshold}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
