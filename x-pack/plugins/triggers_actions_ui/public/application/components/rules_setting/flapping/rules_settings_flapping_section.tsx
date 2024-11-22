/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchProps,
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { flappingOffMessage } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_message';
import {
  RulesSettingsFlappingFormSection,
  RulesSettingsFlappingFormSectionProps,
  RulesSettingsFlappingTitle,
} from './rules_settings_flapping_form_section';

const flappingDescription = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.flappingDetectionDescription',
  {
    defaultMessage:
      'Detect alerts that switch quickly between active and recovered states and reduce unwanted noise for these flapping alerts.',
  }
);

const flappingOnLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.flappingOnLabel',
  {
    defaultMessage: 'On (recommended)',
  }
);

const flappingOffLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.flappingOffLabel',
  {
    defaultMessage: 'Off',
  }
);

export const RulesSettingsFlappingErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsFlappingErrorPrompt"
      color="danger"
      iconType="warning"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.flappingErrorPromptTitle"
            defaultMessage="Unable to load your flapping settings"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.flappingErrorPromptBody"
            defaultMessage="There was an error loading your flapping settings. Contact your administrator for help"
          />
        </p>
      }
    />
  );
});

interface RulesSettingsFlappingFormLeftProps {
  settings: RulesSettingsFlappingProperties;
  onChange: EuiSwitchProps['onChange'];
  isSwitchDisabled: boolean;
}

export const RulesSettingsFlappingFormLeft = memo((props: RulesSettingsFlappingFormLeftProps) => {
  const { settings, onChange, isSwitchDisabled } = props;

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <p>{flappingDescription}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            data-test-subj="rulesSettingsFlappingEnableSwitch"
            label={settings!.enabled ? flappingOnLabel : flappingOffLabel}
            checked={settings!.enabled}
            disabled={isSwitchDisabled}
            onChange={onChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
});

interface RulesSettingsFlappingFormRightProps {
  settings: RulesSettingsFlappingProperties;
  onChange: RulesSettingsFlappingFormSectionProps['onChange'];
  canWrite: boolean;
}

export const RulesSettingsFlappingFormRight = memo((props: RulesSettingsFlappingFormRightProps) => {
  const { settings, onChange, canWrite } = props;

  if (!settings) {
    return null;
  }
  if (!settings.enabled) {
    return (
      <EuiFlexItem data-test-subj="rulesSettingsFlappingOffPrompt">
        <EuiPanel borderRadius="none" color="subdued" grow={false}>
          <EuiText size="s">{flappingOffMessage}</EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem>
      <RulesSettingsFlappingFormSection
        flappingSettings={settings}
        onChange={onChange}
        canWrite={canWrite}
      />
    </EuiFlexItem>
  );
});

export interface RulesSettingsFlappingSectionProps {
  onChange: (key: keyof RulesSettingsFlappingProperties, value: number | boolean) => void;
  settings: RulesSettingsFlappingProperties;
  canShow: boolean | Readonly<{ [x: string]: boolean }>;
  canWrite: boolean;
  hasError: boolean;
}

export const RulesSettingsFlappingSection = memo((props: RulesSettingsFlappingSectionProps) => {
  const { onChange, settings, hasError, canShow, canWrite } = props;

  if (!canShow) {
    return null;
  }
  if (hasError) {
    return <RulesSettingsFlappingErrorPrompt />;
  }
  return (
    <EuiForm data-test-subj="rulesSettingsFlappingSection">
      <EuiFlexGroup>
        <EuiFlexItem>
          <RulesSettingsFlappingTitle />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <RulesSettingsFlappingFormLeft
          isSwitchDisabled={!canWrite}
          settings={settings}
          onChange={(e) => onChange('enabled', e.target.checked)}
        />
        <RulesSettingsFlappingFormRight
          settings={settings}
          onChange={(key, value) => onChange(key, value)}
          canWrite={canWrite}
        />
      </EuiFlexGroup>
    </EuiForm>
  );
});
