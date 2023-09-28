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
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';
import { useUpdateFlappingSettings } from '../../hooks/use_update_flapping_settings';
import { RulesSettingsFlappingSection } from './flapping/rules_settings_flapping_section';

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
    rulesSettings: {
      show,
      save,
      writeFlappingSettingsUI,
      readFlappingSettingsUI,
      // writeQueryDelaySettingsUI,
      // readQueryDelaySettingsUI,
    },
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
  // const canWriteQueryDelaySettings = save && writeQueryDelaySettingsUI && !hasError;
  // const canShowQueryDelaySettings = show && readQueryDelaySettingsUI;

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

  return (
    <EuiModal data-test-subj="rulesSettingsModal" onClose={onClose} maxWidth={880}>
      <EuiModalHeader>
        <EuiModalHeaderTitle component="h3">
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.title"
            defaultMessage="Rule settings"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.calloutMessage', {
            defaultMessage: 'Apply to all rules within the current space.',
          })}
        />
        <EuiHorizontalRule />
        <RulesSettingsFlappingSection
          onChange={(key, value) => handleSettingsChange(key, value)}
          settings={settings}
          canWrite={canWriteFlappingSettings}
          canShow={canShowFlappingSettings}
          hasError={hasError}
          isLoading={isLoading}
        />
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
