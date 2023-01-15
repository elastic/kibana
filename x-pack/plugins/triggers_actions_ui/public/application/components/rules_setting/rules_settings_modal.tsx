/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchProps,
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import {
  RulesSettingsFlappingFormSection,
  RulesSettingsFlappingFormSectionProps,
  RulesSettingsFlappingTitle,
} from './rules_settings_flapping_form_section';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';
import { useUpdateFlappingSettings } from '../../hooks/use_update_flapping_settings';
import { CenterJustifiedSpinner } from '../center_justified_spinner';

const flappingDescription = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.flappingDetectionDescription',
  {
    defaultMessage:
      'Alerts that go quickly go between active and recovered are considered flapping. Detecting these changes and minimizing new alert generation can help reduce unwanted noise in your alerting system.',
  }
);

const flappingEnableLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.enableFlappingLabel',
  {
    defaultMessage: 'Enabled flapping detection (recommended)',
  }
);

export const RulesSettingsErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsErrorPrompt"
      color="danger"
      iconType="alert"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.errorPromptTitle"
            defaultMessage="Unable to load your rules settings"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.errorPromptBody"
            defaultMessage="There was an error loading your rules settings. Contact your administrator for help"
          />
        </p>
      }
    />
  );
});

interface RulesSettingsModalFormLeftProps {
  settings: RulesSettingsFlappingProperties;
  onChange: EuiSwitchProps['onChange'];
  isSwitchDisabled: boolean;
}

export const RulesSettingsModalFormLeft = memo((props: RulesSettingsModalFormLeftProps) => {
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
            data-test-subj="rulesSettingsModalEnableSwitch"
            label={flappingEnableLabel}
            checked={settings!.enabled}
            disabled={isSwitchDisabled}
            onChange={onChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
});

interface RulesSettingsModalFormRightProps {
  settings: RulesSettingsFlappingProperties;
  onChange: RulesSettingsFlappingFormSectionProps['onChange'];
}

export const RulesSettingsModalFormRight = memo((props: RulesSettingsModalFormRightProps) => {
  const { settings, onChange } = props;

  if (!settings) {
    return null;
  }
  if (!settings.enabled) {
    return (
      <EuiFlexItem data-test-subj="rulesSettingsModalFlappingOffPrompt">
        <EuiPanel borderRadius="none" color="subdued" grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesSettings.flapping.flappingSettingsOffDescription"
              defaultMessage="Alert flapping detection is off. Alerts will be generated based on the rule interval. This may result in higher alert volume."
            />
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem>
      <RulesSettingsFlappingFormSection flappingSettings={settings} onChange={onChange} />
    </EuiFlexItem>
  );
});

export interface RulesSettingsModalProps {
  isVisible: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
}

export const RulesSettingsModal = memo((props: RulesSettingsModalProps) => {
  const { isVisible, onClose, setUpdatingRulesSettings, onSave } = props;

  const {
    application: { capabilities },
  } = useKibana().services;
  const {
    rulesSettings: { show, save, writeFlappingSettingsUI, readFlappingSettingsUI },
  } = capabilities;

  const [settings, setSettings] = useState<RulesSettingsFlappingProperties>();

  const { isLoading, isError: hasError } = useGetFlappingSettings({
    enabled: isVisible,
    onSuccess: (fetchedSettings) => {
      if (!settings) {
        setSettings({
          enabled: fetchedSettings.enabled,
          lookBackWindow: fetchedSettings.lookBackWindow,
          statusChangeThreshold: fetchedSettings.statusChangeThreshold,
        });
      }
    },
  });

  const { mutate } = useUpdateFlappingSettings({
    onSave,
    onClose,
    setUpdatingRulesSettings,
  });

  // In the future when we have more settings sub-features, we should
  // disassociate the rule settings capabilities (save, show) from the
  // sub-feature capabilities (writeXSettingsUI).
  const canWriteFlappingSettings = save && writeFlappingSettingsUI && !hasError;
  const canShowFlappingSettings = show && readFlappingSettingsUI;

  const handleSettingsChange = (
    key: keyof RulesSettingsFlappingProperties,
    value: number | boolean
  ) => {
    if (!settings) {
      return;
    }

    const newSettings = {
      ...settings,
      [key]: value,
    };

    setSettings({
      ...newSettings,
      statusChangeThreshold: Math.min(
        newSettings.lookBackWindow,
        newSettings.statusChangeThreshold
      ),
    });
  };

  const handleSave = () => {
    if (!settings) {
      return;
    }
    mutate(settings);
  };

  if (!isVisible) {
    return null;
  }

  const maybeRenderForm = () => {
    if (hasError || !canShowFlappingSettings) {
      return <RulesSettingsErrorPrompt />;
    }
    if (!settings || isLoading) {
      return <CenterJustifiedSpinner />;
    }
    return (
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <RulesSettingsFlappingTitle />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <RulesSettingsModalFormLeft
            isSwitchDisabled={!canWriteFlappingSettings}
            settings={settings}
            onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
          />
          <RulesSettingsModalFormRight
            settings={settings}
            onChange={(key, value) => handleSettingsChange(key, value)}
          />
        </EuiFlexGroup>
      </EuiForm>
    );
  };

  return (
    <EuiModal data-test-subj="rulesSettingsModal" onClose={onClose} maxWidth={880}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h3>
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesSettings.modal.title"
              defaultMessage="Rule Settings"
            />
          </h3>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.calloutMessage', {
            defaultMessage: 'Applies to all rules within the current space',
          })}
        />
        <EuiHorizontalRule />
        {maybeRenderForm()}
        <EuiSpacer />
        <EuiHorizontalRule margin="none" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="rulesSettingsModalCancelButton" onClick={onClose}>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="rulesSettingsModalSaveButton"
          onClick={handleSave}
          disabled={!canWriteFlappingSettings}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
});
