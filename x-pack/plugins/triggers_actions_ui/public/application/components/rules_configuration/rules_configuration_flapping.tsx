/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormRowProps,
  EuiIconTip,
  EuiRange,
  EuiRangeProps,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiPanel,
} from '@elastic/eui';
import {
  RulesConfiguration,
  MIN_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_LOOK_BACK_WINDOW,
  MAX_STATUS_CHANGE_THRESHOLD,
} from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

type FlappingConfiguration = RulesConfiguration['flapping'];
type OnChangeKey = keyof Omit<FlappingConfiguration, 'enabled'>;

const lookBackWindowLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.flapping.lookBackWindowLabel',
  {
    defaultMessage: 'Rule run look back window',
  }
);

const statusChangeThresholdLabel = i18n.translate(
  'xpack.triggersActionsUI.rulesConfiguration.flapping.statusChangeThresholdLabel',
  {
    defaultMessage: 'Alert status change threshold',
  }
);

export interface RulesConfigurationRangeProps {
  label: EuiFormRowProps['label'];
  labelPopoverText?: string;
  min: number;
  max: number;
  value: number;
  disabled?: EuiRangeProps['disabled'];
  onChange?: EuiRangeProps['onChange'];
}

export const RulesConfigurationFlappingTitle = () => {
  return (
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesConfiguration.flapping.alertFlappingDetection"
          defaultMessage="Alert Flapping Detection"
        />
      </h5>
    </EuiTitle>
  );
};

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

interface RulesConfigurationFlappingProps {
  flappingConfiguration: FlappingConfiguration;
  compressed?: boolean;
  onChange: (key: OnChangeKey, value: number) => void;
}

export const RulesConfigurationFlapping = (props: RulesConfigurationFlappingProps) => {
  const { flappingConfiguration, compressed = false, onChange } = props;

  const { lookBackWindow, statusChangeThreshold } = flappingConfiguration;

  const {
    application: { capabilities },
  } = useKibana().services;

  const {
    rules_configuration: { flappingDetection },
  } = capabilities;

  const renderTitle = () => {
    return (
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesConfiguration.flapping.alertFlappingDetectionTitle"
              defaultMessage="Alert Flapping Detection"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
    );
  };

  const renderDescription = () => {
    return (
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesConfiguration.flapping.alertFlappingDetectionDescription"
            defaultMessage="Modify the frequency that an alert can go between active and recovered over a period of rule runs."
          />
        </EuiText>
      </EuiFlexItem>
    );
  };

  return (
    <EuiFlexGroup direction="column">
      {compressed && (
        <>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              {renderTitle()}
              {renderDescription()}
              <EuiSpacer size="s" />
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>
        <RulesConfigurationRange
          min={MIN_LOOK_BACK_WINDOW}
          max={MAX_LOOK_BACK_WINDOW}
          value={lookBackWindow}
          onChange={(e) => onChange('lookBackWindow', parseInt(e.currentTarget.value, 10))}
          label={lookBackWindowLabel}
          labelPopoverText="TODO: look back window helper text"
          disabled={!flappingDetection}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RulesConfigurationRange
          min={MIN_STATUS_CHANGE_THRESHOLD}
          max={MAX_STATUS_CHANGE_THRESHOLD}
          value={statusChangeThreshold}
          onChange={(e) => onChange('statusChangeThreshold', parseInt(e.currentTarget.value, 10))}
          label={statusChangeThresholdLabel}
          labelPopoverText="TODO: status threshold helper text"
          disabled={!flappingDetection}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel borderRadius="none" color="subdued">
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesConfiguration.flapping.flappingConfigurationDescription"
              defaultMessage="An alert will be considered flapping if it changes status {lookBackWindow} within the last {statusChangeThreshold}."
              values={{
                lookBackWindow: <b>{lookBackWindow} times</b>,
                statusChangeThreshold: <b>{statusChangeThreshold} rule runs</b>,
              }}
            />
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
