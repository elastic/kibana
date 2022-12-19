/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useMemo, useEffect } from 'react';
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
  EuiFormRow,
  EuiFormRowProps,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiRange,
  EuiRangeProps,
  EuiIconTip,
  EuiText,
  EuiTitle,
  EuiEmptyPrompt,
  useEuiTheme,
} from '@elastic/eui';
import { CenterJustifiedSpinner } from './center_justified_spinner';
import { getRulesConfiguration } from '../lib/rule_api/get_rules_configuration';
import { updateRulesConfiguration } from '../lib/rule_api/update_rules_configuration';
import { useKibana } from '../../common/lib/kibana';

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

const lookBackWindowLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.modal.lookBackWindowLabel',
  {
    defaultMessage: 'Rule run look back window',
  }
);

const statusChangeThresholdLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.modal.statusChangeThresholdLabel',
  {
    defaultMessage: 'Alert status change threshold',
  }
);

const MIN_LOOK_BACK_WINDOW = 2;
const MAX_LOOK_BACK_WINDOW = 20;

const MIN_STATUS_CHANGE_THRESHOLD = 3;
const MAX_STATUS_CHANGE_THRESHOLD = 20;

export interface RulesConfigurationRangeProps {
  label: EuiFormRowProps['label'];
  labelPopoverText?: string;
  min: number;
  max: number;
  value: number;
  disabled?: EuiRangeProps['disabled'];
  onChange?: EuiRangeProps['onChange'];
}

export const RulesConfigurationRange = (props: RulesConfigurationRangeProps) => {
  const { label, labelPopoverText, min, max, value, disabled, onChange } = props;

  const renderLabel = () => {
    return (
      <div>
        {label}
        &nbsp;
        <EuiIconTip color="subdued" size="s" type="questionInCircle" content={labelPopoverText} />
      </div>
    );
  };

  return (
    <EuiFormRow label={renderLabel()}>
      <EuiRange
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={onChange}
        showLabels
        showValue
      />
    </EuiFormRow>
  );
};

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

  const { euiTheme } = useEuiTheme();

  const euiTextStyles = useMemo(
    () => ({
      backgroundColor: euiTheme.colors.body,
      padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
      marginTop: `${euiTheme.size.xs}`,
    }),
    [euiTheme]
  );

  const handleConfigurationChange = (
    value: number | boolean,
    key: keyof RulesConfiguration['flapping']
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

  const renderFormTitle = () => {
    return (
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesConfiguration.modal.alertFlappingDetection"
              defaultMessage="Alert Flapping Detection"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
    );
  };

  const renderFormLeft = () => {
    return (
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              <p>{flappingDescription}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSwitch
              label={flappingEnableLabel}
              checked={configuration!.enabled}
              disabled={!flappingDetection}
              onChange={() => handleConfigurationChange(!configuration!.enabled, 'enabled')}
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

  const renderFlappingConfigurationDescription = () => {
    if (configuration!.enabled) {
      return (
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesConfiguration.modal.flappingConfigurationDescription"
          defaultMessage="An alert will be considered flapping if it changes status {lookBackWindow} within the last {statusChangeThreshold}."
          values={{
            lookBackWindow: <b>{configuration!.lookBackWindow} times</b>,
            statusChangeThreshold: <b>{configuration!.statusChangeThreshold} rule runs</b>,
          }}
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.triggersActionsUI.rulesConfiguration.modal.flappingConfigurationOffDescription"
        defaultMessage="Alert flapping detection is off. Alerts will be generated based on the rule interval. This may result in higher alert volume."
      />
    );
  };

  const renderFormRight = () => {
    return (
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          {configuration!.enabled && (
            <>
              <EuiFlexItem>
                <RulesConfigurationRange
                  min={MIN_LOOK_BACK_WINDOW}
                  max={MAX_LOOK_BACK_WINDOW}
                  value={configuration!.lookBackWindow}
                  onChange={(e) =>
                    handleConfigurationChange(parseInt(e.currentTarget.value, 10), 'lookBackWindow')
                  }
                  label={lookBackWindowLabel}
                  labelPopoverText="TODO: look back window helper text"
                  disabled={!flappingDetection}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <RulesConfigurationRange
                  min={MIN_STATUS_CHANGE_THRESHOLD}
                  max={MAX_STATUS_CHANGE_THRESHOLD}
                  value={configuration!.statusChangeThreshold}
                  onChange={(e) =>
                    handleConfigurationChange(
                      parseInt(e.currentTarget.value, 10),
                      'statusChangeThreshold'
                    )
                  }
                  label={statusChangeThresholdLabel}
                  labelPopoverText="TODO: status threshold helper text"
                  disabled={!flappingDetection}
                />
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem>
            <EuiText style={euiTextStyles} size="s">
              {renderFlappingConfigurationDescription()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
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
        <EuiFlexGroup>{renderFormTitle()}</EuiFlexGroup>
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
