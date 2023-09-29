/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  DEFAULT_FLAPPING_SETTINGS,
  DEFAULT_QUERY_DELAY_SETTINGS,
  RulesSettingsFlappingProperties,
  RulesSettingsProperties,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-plugin/common';
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
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';
import { RulesSettingsFlappingSection } from './flapping/rules_settings_flapping_section';
import { RulesSettingsQueryDelaySection } from './query_delay/rules_settings_query_delay_section';
import { useGetQueryDelaySettings } from '../../hooks/use_get_query_delay_settings';
import { useUpdateRuleSettings } from '../../hooks/use_update_rule_settings';

export const RulesSettingsErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsErrorPrompt"
      color="danger"
      iconType="warning"
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
      writeQueryDelaySettingsUI,
      readQueryDelaySettingsUI,
    },
  } = capabilities;

  const [settings, setSettings] = useState<RulesSettingsProperties>();

  const { isLoading, isError: hasError } = useGetFlappingSettings({
    enabled: isVisible,
    onSuccess: (fetchedSettings) => {
      if (!settings) {
        setSettings({
          flapping: {
            enabled: fetchedSettings.enabled,
            lookBackWindow: fetchedSettings.lookBackWindow,
            statusChangeThreshold: fetchedSettings.statusChangeThreshold,
          },
          queryDelay: DEFAULT_QUERY_DELAY_SETTINGS,
        });
      } else {
        setSettings({
          ...settings,
          flapping: {
            ...fetchedSettings,
          },
        });
      }
    },
  });

  const { isLoading: isQueryDelayLoading, isError: hasQueryDelayError } = useGetQueryDelaySettings({
    enabled: isVisible,
    onSuccess: (fetchedSettings) => {
      if (!settings) {
        setSettings({
          queryDelay: {
            delay: fetchedSettings.delay,
          },
          flapping: DEFAULT_FLAPPING_SETTINGS,
        });
      } else {
        setSettings({
          ...settings,
          queryDelay: {
            ...fetchedSettings,
          },
        });
      }
    },
  });

  const { mutate } = useUpdateRuleSettings({
    onSave,
    onClose,
    setUpdatingRulesSettings,
  });

  // In the future when we have more settings sub-features, we should
  // disassociate the rule settings capabilities (save, show) from the
  // sub-feature capabilities (writeXSettingsUI).
  const canWriteFlappingSettings = save && writeFlappingSettingsUI && !hasError;
  const canShowFlappingSettings = show && readFlappingSettingsUI;
  const canWriteQueryDelaySettings = save && writeQueryDelaySettingsUI && !hasQueryDelayError;
  const canShowQueryDelaySettings = show && readQueryDelaySettingsUI;

  const handleSettingsChange = (
    setting: keyof RulesSettingsProperties,
    key: keyof RulesSettingsFlappingProperties | keyof RulesSettingsQueryDelayProperties,
    value: number | boolean
  ) => {
    if (!settings) {
      return;
    }

    const newSettings = {
      ...settings,
      [setting]: {
        ...settings[setting],
        [key]: value,
      },
    };

    setSettings({
      ...newSettings,
      flapping: {
        ...newSettings.flapping,
        statusChangeThreshold: Math.min(
          newSettings.flapping.lookBackWindow,
          newSettings.flapping.statusChangeThreshold
        ),
      },
    });
  };

  const handleSave = () => {
    if (!settings) {
      return;
    }
    const updatedSettings: Partial<RulesSettingsProperties> = {};
    if (canWriteFlappingSettings) {
      updatedSettings.flapping = settings.flapping;
    }
    if (canWriteQueryDelaySettings) {
      updatedSettings.queryDelay = settings.queryDelay;
    }
    mutate(updatedSettings);
  };

  if (!isVisible) {
    return null;
  }

  const maybeRenderForm = () => {
    if (!canShowFlappingSettings && !canShowQueryDelaySettings) {
      return <RulesSettingsErrorPrompt />;
    }
    return (
      <>
        <RulesSettingsFlappingSection
          onChange={(key, value) => handleSettingsChange('flapping', key, value)}
          settings={settings?.flapping}
          canWrite={canWriteFlappingSettings}
          canShow={canShowFlappingSettings}
          hasError={hasError}
          isLoading={isLoading}
        />
        <RulesSettingsQueryDelaySection
          onChange={(key, value) => handleSettingsChange('queryDelay', key, value)}
          settings={settings?.queryDelay}
          canWrite={canWriteQueryDelaySettings}
          canShow={canShowQueryDelaySettings}
          hasError={hasQueryDelayError}
          isLoading={isQueryDelayLoading}
        />
      </>
    );
  };

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
          disabled={!canWriteFlappingSettings && !canWriteQueryDelaySettings}
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
