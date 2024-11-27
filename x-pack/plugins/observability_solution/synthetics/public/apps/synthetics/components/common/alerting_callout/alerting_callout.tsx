/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { syntheticsSettingsLocatorID } from '@kbn/observability-plugin/common';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { selectDynamicSettings } from '../../../state/settings';
import { selectMonitorListState, setAlertFlyoutVisible } from '../../../state';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { ConfigKey } from '../../../../../../common/runtime_types';
import {
  FlyoutIdArgument,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import { enableDefaultAlertingAction, getSyntheticsRules } from '../../../state/alert_rules';
import { selectSyntheticsRules } from '../../../state/alert_rules/selectors';

export const AlertingCallout = ({ isAlertingEnabled }: { isAlertingEnabled?: boolean }) => {
  const dispatch = useDispatch();

  const activeRules = useSelector(selectSyntheticsRules);
  useEffect(() => {
    if (!activeRules) {
      dispatch(getSyntheticsRules());
    }
  }, [dispatch, activeRules]);

  const { settings } = useSelector(selectDynamicSettings);

  const hasDefaultConnector = !settings || !isEmpty(settings?.defaultConnectors);

  const { canSave } = useSyntheticsSettingsContext();

  const {
    data: { monitors },
    loaded: monitorsLoaded,
  } = useSelector(selectMonitorListState);

  const syntheticsLocators = useKibana<ClientPluginsStart>().services.share?.url.locators;

  const locator = syntheticsLocators?.get(syntheticsSettingsLocatorID);

  const { data: url } = useFetcher(() => {
    return locator?.getUrl({});
  }, [locator]);

  const hasMonitorsRunningWithAlertingConfigured =
    isAlertingEnabled ??
    (monitorsLoaded &&
      monitors.some((monitor) => monitor[ConfigKey.ALERT_CONFIG]?.status?.enabled));

  const hasHttpMonitorsRunningWithAlertingEnabled =
    isAlertingEnabled ??
    (monitorsLoaded &&
      monitors.some(
        (monitor) =>
          monitor[ConfigKey.MONITOR_TYPE] === 'http' &&
          monitor[ConfigKey.ALERT_CONFIG]?.status?.enabled &&
          monitor[ConfigKey.ENABLED]
      ));
  // display a callout to the user if there are monitors with alerting enabled but no default connector configured
  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  const [monitorStatusRuleFlyoutArgs] = useState<RuleFlyoutArgs>({
    id: SYNTHETICS_STATUS_RULE,
    isNewRuleFlyout: true,
  });
  const [tlsRuleFlyoutArgs] = useState<RuleFlyoutArgs>({
    id: SYNTHETICS_TLS_RULE,
    isNewRuleFlyout: true,
  });

  if (!activeRules) return null;
  const hasStatusRule = activeRules.some(
    (rule) => rule.rule_type_id === SYNTHETICS_STATUS_RULE && rule.enabled
  );
  const hasTlsRules = activeRules.some(
    (rule) => rule.rule_type_id === SYNTHETICS_TLS_RULE && rule.enabled
  );
  const showMonitorStatusCallout =
    canSave && !hasStatusRule && hasMonitorsRunningWithAlertingConfigured;
  const showTlsCallout = canSave && !hasTlsRules && hasHttpMonitorsRunningWithAlertingEnabled;
  const showConnectorCallout =
    canSave && !hasDefaultConnector && hasMonitorsRunningWithAlertingConfigured;
  if (!showMonitorStatusCallout && !showTlsCallout && !showConnectorCallout) return null;
  return (
    <>
      <MissingRuleCallout
        showCallout={showMonitorStatusCallout}
        setFlyoutVisibleArgs={monitorStatusRuleFlyoutArgs}
        content={MISSING_MONITOR_STATUS_CONTENT}
        title={MISSING_MONITOR_STATUS_HEADER}
        buttonLabel={CONFIGURE_CUSTOM_RULE_LABEL}
        createRuleTestId="xpack.plugins.synthetics.monitorStatusRuleMissingCallout.configureNowButton"
        enableDefaultRuleTestId="xpack.plugins.synthetics.monitorStatusRuleMissingCallout.enableDefaultRule"
        defaultRuleType={SYNTHETICS_STATUS_RULE}
        manageRulesProps={toRulesProps(
          'xpack.plugins.synthetics.monitorStatusRuleMissingCallout.manageRulesButton',
          url
        )}
      />
      <MissingRuleCallout
        showCallout={showTlsCallout}
        setFlyoutVisibleArgs={tlsRuleFlyoutArgs}
        content={MISSING_TLS_RULE_CONTENT}
        title={MISSING_TLS_RULE_HEADER}
        buttonLabel={CONFIGURE_CUSTOM_RULE_LABEL}
        defaultRuleType={SYNTHETICS_TLS_RULE}
        createRuleTestId="xpack.plugins.synthetics.tlsRuleMissingCallout.configureNowButton"
        enableDefaultRuleTestId="xpack.plugins.synthetics.tlsRuleMissingCallout.enableDefaultRule"
        manageRulesProps={toRulesProps(
          'xpack.plugins.synthetics.tlsRuleMissingCallout.manageRulesButton',
          url
        )}
      />
      <MissingConnectorCallout
        data-test-subj="xpack.plugins.synthetics.missingConnector.manage"
        showCallout={showConnectorCallout}
        url={url}
      />
    </>
  );
};

function toRulesProps(testId: string, url?: string) {
  if (!url) return undefined;
  return {
    url,
    'data-test-subj': testId,
  };
}

interface ManageRulesProps {
  url: string;
  'data-test-subj': string;
}

interface RuleFlyoutArgs {
  id: FlyoutIdArgument;
  isNewRuleFlyout: boolean;
}

interface MissingRuleCalloutProps {
  showCallout: boolean;
  setFlyoutVisibleArgs: RuleFlyoutArgs;
  title: string;
  buttonLabel: string;
  content: string;
  defaultRuleType: FlyoutIdArgument;
  createRuleTestId: string;
  enableDefaultRuleTestId: string;
  manageRulesProps?: ManageRulesProps;
}

const MissingConnectorCallout = ({
  showCallout,
  url,
  'data-test-subj': testId,
}: {
  showCallout: boolean;
  url?: string;
  'data-test-subj': string;
}) => {
  if (!showCallout) return null;
  return (
    <>
      <EuiCallOut title={MISSING_CONNECTOR_CALLOUT_TITLE} color="warning" iconType="warning">
        <p>{MISSING_DEFAULT_CONNECTOR_LABEL}</p>
        <EuiFlexGroup>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="warning"
              data-test-subj={testId}
              href={url}
              iconType="sortRight"
              iconSide="right"
            >
              <FormattedMessage
                id="xpack.synthetics.alerting.noConnectorsCallout.manageRulesButton"
                defaultMessage="Manage connectors"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

const MissingRuleCallout = ({
  showCallout,
  setFlyoutVisibleArgs,
  title,
  buttonLabel,
  content,
  manageRulesProps,
  createRuleTestId,
  enableDefaultRuleTestId,
  defaultRuleType,
}: MissingRuleCalloutProps) => {
  const dispatch = useDispatch();
  const showFlyout = useCallback(
    () => dispatch(setAlertFlyoutVisible(setFlyoutVisibleArgs)),
    [dispatch, setFlyoutVisibleArgs]
  );
  const dispatchEnableDefaultRule = useCallback(() => {
    dispatch(
      enableDefaultAlertingAction.get({
        enableTls: defaultRuleType === SYNTHETICS_TLS_RULE,
        enableMonitorStatus: defaultRuleType === SYNTHETICS_STATUS_RULE,
      })
    );
  }, [dispatch, defaultRuleType]);
  if (!showCallout) {
    return null;
  }
  return (
    <>
      <EuiCallOut title={title} color="warning" iconType="warning">
        {content}
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj={createRuleTestId} onClick={showFlyout} color="warning">
              {buttonLabel}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="baseline">
              <EuiFlexItem>
                <EuiIconTip
                  color="warning"
                  content="Enable default rule"
                  position="top"
                  type="iInCircle"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty
                  data-test-subj={enableDefaultRuleTestId}
                  color="warning"
                  onClick={dispatchEnableDefaultRule}
                >
                  {ENABLE_DEFAULT_RULE_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!!manageRulesProps && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="warning"
                data-test-subj={manageRulesProps['data-test-subj']}
                href={manageRulesProps.url}
                iconSide="right"
                iconType="sortRight"
              >
                {MANAGE_RULES_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const MISSING_CONNECTOR_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.alerting.noConnectorsCallout.title',
  {
    defaultMessage: 'Default connector is not defined',
  }
);
export const MISSING_DEFAULT_CONNECTOR_LABEL = i18n.translate(
  'xpack.synthetics.alerting.noConnectorsCallout.content',
  {
    defaultMessage:
      'You have monitors with alerting enabled, but there is no default connector configured to send those alerts.',
  }
);
export const MISSING_MONITOR_STATUS_HEADER = i18n.translate(
  'xpack.synthetics.alerting.noMonitorStatus.header',
  {
    defaultMessage: 'Monitor Status Alerts will not be sent',
  }
);
export const MISSING_MONITOR_STATUS_CONTENT = i18n.translate(
  'xpack.synthetics.alerting.noMonitorStatus.content',
  {
    defaultMessage: 'You have Monitors enabled that are not covered by alerts',
  }
);
export const MISSING_TLS_RULE_CONTENT = i18n.translate('xpack.synthetics.alerting.noTls.header', {
  defaultMessage: 'You have HTTP monitors enabled that are not covered by TLS alerts',
});
export const MISSING_TLS_RULE_HEADER = i18n.translate('xpack.synthetics.alerting.noTls.content', {
  defaultMessage: 'TLS Alerts will not be sent',
});
export const CONFIGURE_CUSTOM_RULE_LABEL = i18n.translate(
  'xpack.synthetics.alerting.customRule.label',
  {
    defaultMessage: 'Configure custom rule',
  }
);
export const ENABLE_DEFAULT_RULE_LABEL = i18n.translate(
  'xpack.synthetics.alerting.enableDefaultRule.label',
  {
    defaultMessage: 'Enable default rule',
  }
);
export const MANAGE_RULES_LABEL = i18n.translate('xpack.synthetics.alerting.manageRules.label', {
  defaultMessage: 'Manage rules',
});
