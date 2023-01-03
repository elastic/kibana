/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import { RulesSettings, RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common';
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
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { getFlappingSettings } from '../../lib/rule_api/get_flapping_settings';
import { updateFlappingSettings } from '../../lib/rule_api/update_flapping_settings';
import { RulesSettingsFlapping, RulesSettingsFlappingTitle } from './rules_settings_flapping';
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

export const RulesSettingsErrorPrompt = () => {
  return (
    <EuiEmptyPrompt
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
};

export interface RulesSettingsModalProps {
  isVisible: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
}

export const RulesSettingsModal = (props: RulesSettingsModalProps) => {
  const { isVisible, onClose, setUpdatingRulesSettings, onSave } = props;

  const [settings, setSettings] = useState<RulesSettingsFlappingProperties>();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;

  const {
    rulesSettings: { save, writeFlappingSettingsUI },
  } = capabilities;

  const handleSettingsChange = (key: keyof RulesSettings['flapping'], value: number | boolean) => {
    if (!settings) {
      return;
    }
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleUpdate = async () => {
    if (!settings) {
      return;
    }
    onClose();
    try {
      setUpdatingRulesSettings?.(true);
      await updateFlappingSettings({
        http,
        flappingSettings: settings,
      });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsSuccess', {
          defaultMessage: 'Rules settings updated successfully.',
        })
      );
    } catch (e) {
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsFailure', {
          defaultMessage: 'Failed to update rules settings.',
        })
      );
    }
    setUpdatingRulesSettings?.(false);
    onSave?.();
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const flappingSettings = await getFlappingSettings({ http });
        setSettings({
          enabled: flappingSettings.enabled,
          lookBackWindow: flappingSettings.lookBackWindow,
          statusChangeThreshold: flappingSettings.statusChangeThreshold,
        });
      } catch (e) {
        setHasError(true);
        toasts.addDanger(
          i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.getRulesSettingsError', {
            defaultMessage: 'Failed to get rules Settings.',
          })
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const renderFormLeft = () => {
    return (
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <p>{flappingDescription}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={flappingEnableLabel}
              checked={settings!.enabled}
              disabled={!writeFlappingSettingsUI}
              onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.rulesSettings.modal.enableFlappingHelpText"
                  defaultMessage="Only affects rules whose alerts can self-recover."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  const renderFormRight = () => {
    if (!settings) {
      return null;
    }
    if (!settings.enabled) {
      return (
        <EuiFlexItem>
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
        <RulesSettingsFlapping
          flappingSettings={settings}
          onChange={(key, value) => handleSettingsChange(key, value)}
        />
      </EuiFlexItem>
    );
  };

  const renderForm = () => {
    if (hasError) {
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
          {renderFormLeft()}
          {renderFormRight()}
        </EuiFlexGroup>
      </EuiForm>
    );
  };

  return (
    <EuiModal onClose={onClose} maxWidth={880}>
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
        {renderForm()}
        <EuiSpacer />
        <EuiHorizontalRule margin="none" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton fill onClick={handleUpdate} disabled={!save || hasError}>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
