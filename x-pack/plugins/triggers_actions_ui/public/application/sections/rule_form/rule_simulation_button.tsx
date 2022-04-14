/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonIcon,
  EuiStat,
  EuiHealth,
  EuiCallOut,
  EuiStatProps,
  EuiIcon,
} from '@elastic/eui';
import _, { isNumber, lt, lte } from 'lodash';
import { euiDarkVars as euiThemeDark, euiLightVars as euiThemeLight, Theme } from '@kbn/ui-theme';
import { RuleSimulationResult } from '../../lib/rule_api/simulate';
import { useKibana } from '../../../common/lib/kibana';

interface RuleSimulationButtonProps {
  isSaving: boolean;
  isSimulating: boolean;
  isFormLoading?: boolean;
  lastRuleSimulationResult: RuleSimulationResult | undefined;
  onSimulate: () => void;
}

export const RuleSimulationButton = ({
  isSimulating,
  isSaving,
  isFormLoading,
  lastRuleSimulationResult,
  onSimulate,
}: RuleSimulationButtonProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onOpenLastResultClick = () => setIsPopoverOpen((currentState) => !currentState);
  const closePopover = () => setIsPopoverOpen(false);

  const { uiSettings } = useKibana().services;

  const euiTheme: Theme = useMemo(
    () => (uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight),
    [uiSettings]
  );

  const isDisabled = isSaving || isSimulating || isFormLoading;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          color="accent"
          data-test-subj="simulateRuleButton"
          type="submit"
          iconType="play"
          isDisabled={isDisabled}
          isLoading={isSimulating}
          onClick={onSimulate}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleAddFooter.simulateButtonLabel"
            defaultMessage="Simulate"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              display="base"
              color="accent"
              onClick={onOpenLastResultClick}
              iconType={lastRuleSimulationResult ? 'eye' : 'eyeClosed'}
              aria-label="Help"
              size="m"
              isDisabled={isDisabled || !lastRuleSimulationResult}
              isLoading={isSimulating}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="upRight"
          panelPaddingSize="s"
        >
          <EuiPopoverTitle>
            <EuiFlexGroup>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleSimulationButton.lastResult.header"
                  defaultMessage="Last Simulated Execution"
                />
              </EuiFlexItem>
              {lastRuleSimulationResult && (
                <EuiFlexItem>
                  <EuiHealth color={getStatusColor(lastRuleSimulationResult.result.status)}>
                    {lastRuleSimulationResult.result.status ?? 'unknown'}
                  </EuiHealth>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPopoverTitle>
          <div style={{ width: '600px' }}>
            {lastRuleSimulationResult && (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <StatWithThreshold
                      euiTheme={euiTheme}
                      value={lastRuleSimulationResult.result.numberOfDetectedAlerts}
                      titleSize="m"
                      description="# of Detected Alerts"
                      // mock numbers, should be configurable
                      successThreshold={0}
                      primaryThreshold={10}
                      warningThreshold={100}
                      errorThreshold={Number.MAX_VALUE}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <StatWithThreshold
                      euiTheme={euiTheme}
                      value={lastRuleSimulationResult.result.lastDuration}
                      titleSize="m"
                      description="Duration (ms)"
                      // mock numbers, should be configurable
                      successThreshold={100}
                      primaryThreshold={1000}
                      warningThreshold={30000}
                      errorThreshold={Number.MAX_VALUE}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <StatWithThreshold
                      euiTheme={euiTheme}
                      value={lastRuleSimulationResult.result.numberOfScheduledActions}
                      description="# of Scheduled Actions"
                      titleSize="xs"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <StatWithThreshold
                      euiTheme={euiTheme}
                      value={lastRuleSimulationResult.result.numberOfTriggeredActions}
                      description="# of Triggered Actions"
                      titleSize="xs"
                      // warn is less actions were triggered than scheduled
                      warningThreshold={lastRuleSimulationResult.result.numberOfScheduledActions}
                      comparison={lt}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {lastRuleSimulationResult.result.metrics && (
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiCallOut title="Metrics" iconType="search">
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <EuiStat
                              title={lastRuleSimulationResult.result.metrics.numSearches ?? 0}
                              description="# of ES searches"
                              titleColor="primary"
                              titleSize="xs"
                              textAlign="right"
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiStat
                              title={
                                lastRuleSimulationResult.result.metrics.esSearchDurationMs ?? 0
                              }
                              description="ES search duration (ms)"
                              titleColor="primary"
                              titleSize="xs"
                              textAlign="right"
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiCallOut>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </>
            )}
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const StatWithThreshold = ({
  value,
  description,
  primaryThreshold,
  successThreshold,
  accentThreshold,
  warningThreshold,
  errorThreshold,
  comparison,
  titleSize,
  euiTheme,
}: {
  value: number | undefined;
  description: string;
  primaryThreshold?: number;
  successThreshold?: number;
  accentThreshold?: number;
  warningThreshold?: number;
  errorThreshold?: number;
  comparison?: (left: number, right: number) => boolean;
  titleSize?: EuiStatProps['titleSize'];
  euiTheme: Theme;
}) => {
  const { color, icon } = getNumericRangeColorAndIcon(
    euiTheme,
    value,
    primaryThreshold,
    successThreshold,
    accentThreshold,
    warningThreshold,
    errorThreshold,
    comparison
  );
  return (
    <EuiStat
      title={value ?? 0}
      description={description}
      titleColor={color}
      textAlign="right"
      titleSize={titleSize}
    >
      {icon ? icon : <></>}
    </EuiStat>
  );
};

function getStatusColor(status: RuleSimulationResult['result']['status']) {
  if (status === 'ok') {
    return 'primary';
  } else if (status === 'active') {
    return 'success';
  } else if (status === 'error') {
    return 'danger';
  } else if (status === 'warning') {
    return 'warning';
  } else {
    return 'subdued';
  }
}

function getNumericRangeColorAndIcon(
  euiTheme: Theme,
  value: number | undefined,
  primaryThreshold?: number,
  successThreshold?: number,
  accentThreshold?: number,
  warningThreshold?: number,
  errorThreshold?: number,
  comparison: (left: number, right: number) => boolean = lte
) {
  if (isNumber(value)) {
    if (isNumber(primaryThreshold) && comparison(value, primaryThreshold)) {
      return { color: 'primary' };
    } else if (isNumber(successThreshold) && comparison(value, successThreshold)) {
      return { color: 'success', icon: <EuiIcon type="check" color="success" /> };
    } else if (isNumber(accentThreshold) && comparison(value, accentThreshold)) {
      return { color: 'accent' };
    } else if (isNumber(warningThreshold) && comparison(value, warningThreshold)) {
      return {
        color: euiTheme.euiColorWarningText,
        icon: <EuiIcon type="alert" color="warning" />,
      };
    } else if (isNumber(errorThreshold) && comparison(value, errorThreshold)) {
      return { color: 'danger', icon: <EuiIcon type="alert" color="danger" /> };
    }
  }
  return { color: 'primary', icon: <></> };
}

// eslint-disable-next-line import/no-default-export
export { RuleSimulationButton as default };
