/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { RuleSettingsFlappingInputs } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_inputs';
import { RuleSettingsFlappingMessage } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_message';
import { Rule } from '@kbn/alerts-ui-shared';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetFlappingSettings } from '../../hooks/use_get_flapping_settings';
import { useKibana } from '../../../common/lib/kibana';
import { Flapping } from '@kbn/alerting-plugin/common';

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
    defaultMessage: 'Custom',
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

const flappingOffContentRules = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingOffContentRules',
  {
    defaultMessage: 'Rules',
  }
);

const flappingOffContentSettings = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingOffContentSettings',
  {
    defaultMessage: 'Settings',
  }
);

const flappingTitlePopoverFlappingDetection = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopoverFlappingDetection',
  {
    defaultMessage: 'flapping detection',
  }
);

const flappingTitlePopoverAlertStatus = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopoverAlertStatus',
  {
    defaultMessage: 'alert status change threshold',
  }
);

const flappingTitlePopoverLookBack = i18n.translate(
  'xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopoverLookBack',
  {
    defaultMessage: 'rule run look back window',
  }
);

const clampFlappingValues = (flapping: Rule['flapping']) => {
  if (!flapping) {
    return;
  }
  return {
    ...flapping,
    statusChangeThreshold: Math.min(flapping.lookBackWindow, flapping.statusChangeThreshold),
  };
};

const INTEGER_REGEX = /^[1-9][0-9]*$/;

export interface RuleFormAdvancedOptionsProps {
  alertDelay?: number;
  flappingSettings?: Flapping | null;
  onAlertDelayChange: (value: string) => void;
  onFlappingChange: (value: Flapping | null) => void;
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

  const {
    application: {
      capabilities: { rulesSettings },
    },
  } = useKibana().services;

  const { writeFlappingSettingsUI = false } = rulesSettings || {};

  const [isFlappingOffPopoverOpen, setIsFlappingOffPopoverOpen] = useState<boolean>(false);
  const [isFlappingTitlePopoverOpen, setIsFlappingTitlePopoverOpen] = useState<boolean>(false);

  const cachedFlappingSettings = useRef<Flapping>();

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
    (flapping: Flapping) => {
      const clampedValue = clampFlappingValues(flapping);
      if (!clampedValue) {
        return;
      }
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

  const flappingTitleTooltip = useMemo(() => {
    return (
      <EuiOutsideClickDetector onOutsideClick={() => setIsFlappingTitlePopoverOpen(false)}>
        <EuiPopover
          repositionOnScroll
          isOpen={isFlappingTitlePopoverOpen}
          anchorPosition="leftCenter"
          panelStyle={{
            width: 500,
          }}
          button={
            <EuiButtonIcon
              display="empty"
              color="primary"
              iconType="questionInCircle"
              aria-label="Flapping title info"
              onClick={() => setIsFlappingTitlePopoverOpen(!isFlappingTitlePopoverOpen)}
            />
          }
        >
          <EuiPopoverTitle>Alert flapping detection</EuiPopoverTitle>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopover1"
              defaultMessage="When {flappingDetection} is turned on, alerts that switch quickly between active and recovered states are identified as “flapping” and notifications are reduced."
              values={{
                flappingDetection: <b>{flappingTitlePopoverFlappingDetection}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopover2"
              defaultMessage="The {alertStatus} defines a period (minimum number of runs) that is used in the detection algorithm. "
              values={{
                alertStatus: <b>{flappingTitlePopoverAlertStatus}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopover3"
              defaultMessage="The {lookBack} indicates the minimum number of times alerts must switch states within the threshold period to qualify as flapping alerts."
              values={{
                lookBack: <b>{flappingTitlePopoverLookBack}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingTitlePopover4"
              defaultMessage="Go to {rules} > {settings} to turn on flapping detection for all rules in a space. You can subsequently customize the look back window and threshold values in each rule."
              values={{
                rules: <b>{flappingOffContentRules}</b>,
                settings: <b>{flappingOffContentSettings}</b>,
              }}
            />
          </EuiText>
        </EuiPopover>
      </EuiOutsideClickDetector>
    );
  }, [isFlappingTitlePopoverOpen]);

  const flappingOffTooltip = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }
    const { enabled } = spaceFlappingSettings;
    if (enabled) {
      return null;
    }

    if (writeFlappingSettingsUI) {
      return (
        <EuiOutsideClickDetector onOutsideClick={() => setIsFlappingOffPopoverOpen(false)}>
          <EuiPopover
            repositionOnScroll
            isOpen={isFlappingOffPopoverOpen}
            anchorPosition="leftCenter"
            panelStyle={{
              width: 250,
            }}
            button={
              <EuiButtonIcon
                display="empty"
                color="primary"
                iconType="questionInCircle"
                aria-label="Flapping Off Info"
                onClick={() => setIsFlappingOffPopoverOpen(!isFlappingOffPopoverOpen)}
              />
            }
          >
            <EuiText size="s">
              <FormattedMessage
                id="xpack.triggersActionsUI.ruleFormAdvancedOptions.flappingOffPopoverContent"
                defaultMessage="Go to {rules} > {settings} to turn on flapping detection for all rules in a space. You can subsequently customize the look back window and threshold values in each rule."
                values={{
                  rules: <b>{flappingOffContentRules}</b>,
                  settings: <b>{flappingOffContentSettings}</b>,
                }}
              />
            </EuiText>
          </EuiPopover>
        </EuiOutsideClickDetector>
      );
    }
    // TODO: Add the external doc link here!
    return (
      <EuiLink href="" target="_blank">
        {flappingExternalLinkLabel}
      </EuiLink>
    );
  }, [writeFlappingSettingsUI, isFlappingOffPopoverOpen, spaceFlappingSettings]);

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
            {flappingOffTooltip}
          </EuiFlexItem>
        </EuiFlexGroup>
        {flappingSettings && enabled && (
          <>
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </>
        )}
      </EuiFlexItem>
    );
  }, [
    isDesktop,
    euiTheme,
    spaceFlappingSettings,
    flappingSettings,
    flappingOffTooltip,
    onFlappingToggle,
  ]);

  const flappingFormBody = useMemo(() => {
    if (!spaceFlappingSettings || !spaceFlappingSettings.enabled) {
      return null;
    }
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
  }, [
    flappingSettings,
    spaceFlappingSettings,
    onLookBackWindowChange,
    onStatusChangeThresholdChange,
  ]);

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
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>{flappingFormRowLabel}</EuiFlexItem>
                  <EuiFlexItem grow={false}>{flappingTitleTooltip}</EuiFlexItem>
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
