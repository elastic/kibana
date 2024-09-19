/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiLink,
} from '@elastic/eui';
import { RuleSettingsFlappingInputs } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_inputs';
import { RuleSettingsFlappingMessage } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_message';
import { RuleSpecificFlappingProperties } from '@kbn/alerting-plugin/common';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';

const alertDelayFormRowLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayLabel',
  {
    defaultMessage: 'Alert delay',
  }
);

const alertDelayIconTipDescription = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldHelp',
  {
    defaultMessage:
      'An alert occurs only when the specified number of consecutive runs meet the rule conditions.',
  }
);

const alertDelayPrependLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldLabel',
  {
    defaultMessage: 'Alert after',
  }
);

const alertDelayAppendLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldAppendLabel',
  {
    defaultMessage: 'consecutive matches',
  }
);

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

const flappingExternalLinkLabel = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingExternalLinkLabel',
  {
    defaultMessage: "What's this?",
  }
);

const flappingFormRowLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.flappingLabel',
  {
    defaultMessage: 'Alert flapping detection',
  }
);

const flappingIconTipDescription = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingIconTipDescription',
  {
    defaultMessage:
      'Detect alerts that switch quickly between active and recovered states and reduce unwanted noise for these flapping alerts.',
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
    enabledFlapping = true,
    onAlertDelayChange,
    onFlappingChange,
  } = props;

  const cachedFlappingSettings = useRef<RuleSpecificFlappingProperties>();

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

  const internalOnFlappingChange = useCallback(
    (flapping: RuleSpecificFlappingProperties) => {
      const clampedValue = clampFlappingValues(flapping);
      onFlappingChange(clampedValue);
      cachedFlappingSettings.current = clampedValue;
    },
    [onFlappingChange]
  );

  const onLookBackWindowChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      internalOnFlappingChange({
        ...flappingSettings,
        lookBackWindow: value,
      });
    },
    [flappingSettings, internalOnFlappingChange]
  );

  const onStatusChangeThresholdChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      internalOnFlappingChange({
        ...flappingSettings,
        statusChangeThreshold: value,
      });
    },
    [flappingSettings, internalOnFlappingChange]
  );

  const onFlappingToggle = useCallback(() => {
    if (!spaceFlappingSettings) {
      return;
    }
    if (flappingSettings) {
      cachedFlappingSettings.current = flappingSettings;
      return onFlappingChange(null);
    }
    const initialFlappingSettings = cachedFlappingSettings.current || spaceFlappingSettings;
    onFlappingChange({
      lookBackWindow: initialFlappingSettings.lookBackWindow,
      statusChangeThreshold: initialFlappingSettings.statusChangeThreshold,
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
            {flappingSettings && enabled && (
              <EuiBadge color="primary">{flappingOverrideLabel}</EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {enabled && (
              <EuiSwitch
                data-test-subj="ruleFormAdvancedOptionsOverrideSwitch"
                compressed
                checked={!!flappingSettings}
                label={flappingOverrideConfiguration}
                onChange={onFlappingToggle}
              />
            )}
            {!enabled && (
              // TODO: Add the help link here
              <EuiLink href="" target="_blank">
                {flappingExternalLinkLabel}
              </EuiLink>
            )}
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
    if (!spaceFlappingSettings || !spaceFlappingSettings.enabled) {
      return null;
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
    <EuiPanel color="subdued" hasShadow={false} data-test-subj="ruleFormAdvancedOptions">
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            fullWidth
            label={
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>{alertDelayFormRowLabel}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={alertDelayIconTipDescription} position="top" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            data-test-subj="alertDelayFormRow"
            display="rowCompressed"
          >
            <EuiFieldNumber
              fullWidth
              min={1}
              value={alertDelay || ''}
              name="alertDelay"
              data-test-subj="alertDelayInput"
              prepend={alertDelayPrependLabel}
              append={alertDelayAppendLabel}
              onChange={internalOnAlertDelayChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {isInitialLoading && <EuiLoadingSpinner />}
        {spaceFlappingSettings && enabledFlapping && (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              fullWidth
              label={
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>{flappingFormRowLabel}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip content={flappingIconTipDescription} position="top" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
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
