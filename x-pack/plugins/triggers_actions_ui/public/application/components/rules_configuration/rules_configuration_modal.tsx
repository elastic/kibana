/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import { RulesConfiguration } from '@kbn/alerting-plugin/common';
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
import { getRulesConfiguration } from '../../lib/rule_api/get_rules_configuration';
import { updateRulesConfiguration } from '../../lib/rule_api/update_rules_configuration';
import {
  RulesConfigurationFlapping,
  RulesConfigurationFlappingTitle,
} from './rules_configuration_flapping';
import { CenterJustifiedSpinner } from '../center_justified_spinner';

const flappingDescription = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.modal.flappingDetectionDescription',
  {
    defaultMessage:
      'Alerts that go quickly go between active and recovered are considered flapping. Detecting these changes and minimizing new alert generation can help reduce unwanted noise in your alerting system.',
  }
);

const flappingEnableLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.modal.enableFlappingLabel',
  {
    defaultMessage: 'Enabled flapping detection (recommended)',
  }
);

export const RulesConfigurationErrorPrompt = () => {
  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="alert"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesConfiguration.modal.errorPromptTitle"
            defaultMessage="Unable to load your rules configuration"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesConfiguration.modal.errorPromptBody"
            defaultMessage="There was an error loading your rules configurations. Contact your administrator for help"
          />
        </p>
      }
    />
  );
};

export interface RulesConfigurationModalProps {
  isVisible: boolean;
  setUpdatingRulesConfiguration?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
}

export const RulesConfigurationModal = (props: RulesConfigurationModalProps) => {
  const { isVisible, onClose, setUpdatingRulesConfiguration, onSave } = props;

  const [configuration, setConfiguration] = useState<RulesConfiguration['flapping']>();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;

  const {
    rules_configuration: { save, flappingDetection },
  } = capabilities;

  const handleConfigurationChange = (
    key: keyof RulesConfiguration['flapping'],
    value: number | boolean
  ) => {
    if (!configuration) {
      return;
    }
    setConfiguration({
      ...configuration,
      [key]: value,
    });
  };

  const handleUpdate = async () => {
    if (!configuration) {
      return;
    }
    onClose();
    try {
      setUpdatingRulesConfiguration?.(true);
      await updateRulesConfiguration({
        http,
        rulesConfiguration: {
          flapping: configuration,
        },
      });
      toasts.addSuccess(
        i18n.translate(
          'xpack.triggersActionsUI.rulesConfiguration.modal.updateRulesConfigurationSuccess',
          {
            defaultMessage: 'Rules configuration updated successfully.',
          }
        )
      );
    } catch (e) {
      toasts.addDanger(
        i18n.translate(
          'xpack.triggersActionsUI.rulesConfiguration.modal.updateRulesConfigurationFailure',
          {
            defaultMessage: 'Failed to update rules configuration.',
          }
        )
      );
    }
    setUpdatingRulesConfiguration?.(false);
    onSave?.();
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const rulesConfiguration = await getRulesConfiguration({ http });
        setConfiguration(rulesConfiguration.flapping);
      } catch (e) {
        setHasError(true);
        toasts.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.rulesConfiguration.modal.getRulesConfigurationError',
            {
              defaultMessage: 'Failed to get rules configuration.',
            }
          )
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
              checked={configuration!.enabled}
              disabled={!flappingDetection}
              onChange={(e) => handleConfigurationChange('enabled', e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.rulesConfiguration.modal.enableFlappingHelpText"
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
    if (!configuration) {
      return null;
    }
    if (!configuration.enabled) {
      return (
        <EuiFlexItem>
          <EuiPanel borderRadius="none" color="subdued" grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesConfiguration.flapping.flappingConfigurationOffDescription"
                defaultMessage="Alert flapping detection is off. Alerts will be generated based on the rule interval. This may result in higher alert volume."
              />
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexItem>
        <RulesConfigurationFlapping
          flappingConfiguration={configuration}
          onChange={(key, value) => handleConfigurationChange(key, value)}
        />
      </EuiFlexItem>
    );
  };

  const renderForm = () => {
    if (hasError) {
      return <RulesConfigurationErrorPrompt />;
    }
    if (!configuration || isLoading) {
      return <CenterJustifiedSpinner />;
    }
    return (
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <RulesConfigurationFlappingTitle />
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
              id="xpack.triggersActionsUI.rulesConfiguration.modal.title"
              defaultMessage="Rule Settings"
            />
          </h3>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.triggersActionsUI.rulesConfiguration.modal.calloutMessage', {
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
            id="xpack.triggersActionsUI.rulesConfiguration.modal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton fill onClick={handleUpdate} disabled={!save || hasError}>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesConfiguration.modal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
