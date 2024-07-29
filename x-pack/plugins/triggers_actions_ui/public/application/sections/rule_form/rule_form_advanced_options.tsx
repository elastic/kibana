/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSwitch,
  EuiText,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { RuleSettingsFlappingInputs } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_inputs';
import {
  RuleSettingsFlappingMessage,
  flappingOffMessage,
} from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_message';
import { RuleSpecificFlappingProperties } from '@kbn/alerting-plugin/common';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';

const flappingLabel = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingLabel',
  {
    defaultMessage: 'Flapping Detection',
  }
);

const flappingOnLabel = i18n.translate('xpack.triggersActionsUI.ruleFormAdvancedOptions.onLabel', {
  defaultMessage: 'ON',
});

const flappingOffLabel = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.offLabel',
  {
    defaultMessage: 'OFF',
  }
);

const flappingOverrideLabel = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.overrideLabel',
  {
    defaultMessage: 'Override',
  }
);

const flappingOverrideConfiguration = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingOverrideConfiguration',
  {
    defaultMessage: 'Override Configuration',
  }
);

const clampFlappingValues = (flapping: RuleSpecificFlappingProperties) => {
  return {
    ...flapping,
    statusChangeThreshold: Math.min(flapping.lookBackWindow, flapping.statusChangeThreshold),
  };
};

const INTEGER_REGEX = /^[1-9][0-9]*$/;

export interface RuleFormAdvancedOptionsProps {
  alertDelay?: number;
  flappingSettings?: RuleSpecificFlappingProperties;
  onAlertDelayChange: (value: string) => void;
  onFlappingChange: (value: RuleSpecificFlappingProperties | null) => void;
  enabledFlapping?: boolean;
}

export const RuleFormAdvancedOptions = (props: RuleFormAdvancedOptionsProps) => {
  const {
    alertDelay,
    flappingSettings,
    enabledFlapping = false,
    onAlertDelayChange,
    onFlappingChange,
  } = props;

  const isDesktop = useIsWithinMinBreakpoint('xl');

  const { euiTheme } = useEuiTheme();

  const { data: spaceFlappingSettings, isInitialLoading } = useGetFlappingSettings({
    enabled: enabledFlapping,
  });

  const internalOnAlertDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || INTEGER_REGEX.test(value)) {
        onAlertDelayChange(value);
      }
    },
    [onAlertDelayChange]
  );

  const onLookBackWindowChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      const newSettings = {
        ...flappingSettings,
        lookBackWindow: value,
      };
      onFlappingChange(clampFlappingValues(newSettings));
    },
    [flappingSettings, onFlappingChange]
  );

  const onStatusChangeThresholdChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      const newSettings = {
        ...flappingSettings,
        statusChangeThreshold: value,
      };
      onFlappingChange(clampFlappingValues(newSettings));
    },
    [flappingSettings, onFlappingChange]
  );

  const onFlappingToggle = useCallback(() => {
    if (!spaceFlappingSettings) {
      return;
    }
    if (flappingSettings) {
      onFlappingChange(null);
      return;
    }
    onFlappingChange({
      lookBackWindow: spaceFlappingSettings.lookBackWindow,
      statusChangeThreshold: spaceFlappingSettings.statusChangeThreshold,
    });
  }, [spaceFlappingSettings, flappingSettings, onFlappingChange]);

  const flappingFormHeader = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }
    const { enabled } = spaceFlappingSettings;

    return (
      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="s"
          direction={isDesktop ? 'row' : 'column'}
          alignItems={isDesktop ? 'center' : undefined}
        >
          <EuiFlexItem style={{ flexDirection: 'row' }}>
            <EuiText size="s" style={{ marginRight: euiTheme.size.xs }}>
              {flappingLabel}
            </EuiText>
            <EuiBadge color={enabled ? 'success' : 'default'}>
              {enabled ? flappingOnLabel : flappingOffLabel}
            </EuiBadge>
            {flappingSettings && (
              <EuiBadge color={enabled ? 'primary' : 'hollow'}>{flappingOverrideLabel}</EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              checked={!!flappingSettings}
              label={flappingOverrideConfiguration}
              onChange={onFlappingToggle}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {flappingSettings && (
          <>
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </>
        )}
      </EuiFlexItem>
    );
  }, [isDesktop, euiTheme, spaceFlappingSettings, flappingSettings, onFlappingToggle]);

  const flappingFormBody = useMemo(() => {
    if (!flappingSettings) {
      return null;
    }
    return (
      <EuiFlexItem>
        <RuleSettingsFlappingInputs
          lookBackWindow={flappingSettings.lookBackWindow}
          statusChangeThreshold={flappingSettings.statusChangeThreshold}
          onLookBackWindowChange={onLookBackWindowChange}
          onStatusChangeThresholdChange={onStatusChangeThresholdChange}
        />
      </EuiFlexItem>
    );
  }, [flappingSettings, onLookBackWindowChange, onStatusChangeThresholdChange]);

  const flappingFormMessage = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }

    if (!spaceFlappingSettings.enabled) {
      return (
        <EuiSplitPanel.Inner
          color="subdued"
          style={{
            borderTop: euiTheme.border.thin,
          }}
        >
          {flappingOffMessage}
        </EuiSplitPanel.Inner>
      );
    }

    const settingsToUse = flappingSettings || spaceFlappingSettings;
    return (
      <EuiSplitPanel.Inner
        color="subdued"
        style={{
          borderTop: euiTheme.border.thin,
        }}
      >
        <RuleSettingsFlappingMessage
          lookBackWindow={settingsToUse.lookBackWindow}
          statusChangeThreshold={settingsToUse.statusChangeThreshold}
        />
      </EuiSplitPanel.Inner>
    );
  }, [spaceFlappingSettings, flappingSettings, euiTheme]);

  return (
    <EuiPanel color="subdued" hasShadow={false}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.alertDelayLabel', {
              defaultMessage: 'Alert delay',
            })}
            data-test-subj="alertDelayFormRow"
            display="rowCompressed"
          >
            <EuiFieldNumber
              fullWidth
              min={1}
              value={alertDelay || ''}
              name="alertDelay"
              data-test-subj="alertDelayInput"
              prepend={[
                i18n.translate('xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldLabel', {
                  defaultMessage: 'Alert after',
                }),
                <EuiIconTip
                  position="right"
                  type="questionInCircle"
                  content={
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldHelp"
                      defaultMessage="An alert occurs only when the specified number of consecutive runs meet the rule conditions."
                    />
                  }
                />,
              ]}
              append={i18n.translate(
                'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldAppendLabel',
                {
                  defaultMessage: 'consecutive matches',
                }
              )}
              onChange={internalOnAlertDelayChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {isInitialLoading && <EuiLoadingSpinner />}
        {spaceFlappingSettings && (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.flappingLabel', {
                defaultMessage: 'Alert flapping detection',
              })}
              data-test-subj="alertFlappingFormRow"
              display="rowCompressed"
            >
              <EuiSplitPanel.Outer hasBorder>
                <EuiSplitPanel.Inner>
                  <EuiFlexGroup direction="column">
                    {flappingFormHeader}
                    {flappingFormBody}
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                {flappingFormMessage}
              </EuiSplitPanel.Outer>
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
