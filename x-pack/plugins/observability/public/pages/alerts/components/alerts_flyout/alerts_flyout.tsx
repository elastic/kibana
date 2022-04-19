/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_UUID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import moment from 'moment-timezone';
import React, { useMemo } from 'react';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { TopAlert } from '../../containers';
import { asDuration } from '../../../../../common/utils/formatters';
import type { ObservabilityRuleTypeRegistry } from '../../../../rules/create_observability_rule_type_registry';
import { parseAlert } from '../parse_alert';
import { AlertStatusIndicator } from '../../../../components/shared/alert_status_indicator';
import { ExperimentalBadge } from '../../../../components/shared/experimental_badge';
import { translations, paths } from '../../../../config';

type AlertsFlyoutProps = {
  alert?: TopAlert;
  alerts?: Array<Record<string, unknown>>;
  isInApp?: boolean;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  selectedAlertId?: string;
} & EuiFlyoutProps;

export function AlertsFlyout({
  alert,
  alerts,
  isInApp = false,
  observabilityRuleTypeRegistry,
  onClose,
  selectedAlertId,
}: AlertsFlyoutProps) {
  const dateFormat = useUiSetting<string>('dateFormat');
  const { services } = useKibana();
  const { http } = services;
  const prepend = http?.basePath.prepend;

  const decoratedAlerts = useMemo(() => {
    const parseObservabilityAlert = parseAlert(observabilityRuleTypeRegistry);
    return (alerts ?? []).map(parseObservabilityAlert);
  }, [alerts, observabilityRuleTypeRegistry]);

  let alertData = alert;
  if (!alertData) {
    alertData = decoratedAlerts?.find((a) => a.fields[ALERT_UUID] === selectedAlertId);
  }
  if (!alertData) {
    return null;
  }

  const ruleId = alertData.fields['kibana.alert.rule.uuid'] ?? null;
  const linkToRule = ruleId && prepend ? prepend(paths.management.ruleDetails(ruleId)) : null;

  const overviewListItems = [
    {
      title: translations.alertsFlyout.statusLabel,
      description: (
        <AlertStatusIndicator
          alertStatus={alertData.active ? ALERT_STATUS_ACTIVE : ALERT_STATUS_RECOVERED}
        />
      ),
    },
    {
      title: translations.alertsFlyout.lastUpdatedLabel,
      description: (
        <span title={alertData.start.toString()}>{moment(alertData.start).format(dateFormat)}</span>
      ),
    },
    {
      title: translations.alertsFlyout.durationLabel,
      description: asDuration(alertData.fields[ALERT_DURATION], { extended: true }),
    },
    {
      title: translations.alertsFlyout.expectedValueLabel,
      description: alertData.fields[ALERT_EVALUATION_THRESHOLD] ?? '-',
    },
    {
      title: translations.alertsFlyout.actualValueLabel,
      description: alertData.fields[ALERT_EVALUATION_VALUE] ?? '-',
    },
    {
      title: translations.alertsFlyout.ruleTypeLabel,
      description: alertData.fields[ALERT_RULE_CATEGORY] ?? '-',
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="alertsFlyout">
      <EuiFlyoutHeader hasBorder>
        <ExperimentalBadge />
        <EuiSpacer size="s" />
        <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
          <h2>{alertData.fields[ALERT_RULE_NAME]}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h4>{translations.alertsFlyout.reasonTitle}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{alertData.reason}</EuiText>
        <EuiSpacer size="s" />
        {!!linkToRule && (
          <EuiLink href={linkToRule} data-test-subj="viewRuleDetailsFlyout">
            {translations.alertsFlyout.viewRulesDetailsLinkText}
          </EuiLink>
        )}
        <EuiHorizontalRule size="full" />
        <EuiTitle size="xs">
          <h4>{translations.alertsFlyout.documentSummaryTitle}</h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiDescriptionList
          compressed={true}
          type="responsiveColumn"
          listItems={overviewListItems}
          titleProps={{
            'data-test-subj': 'alertsFlyoutDescriptionListTitle',
          }}
          descriptionProps={{
            'data-test-subj': 'alertsFlyoutDescriptionListDescription',
          }}
        />
      </EuiFlyoutBody>
      {alertData.link && !isInApp && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                href={prepend && prepend(alertData.link)}
                data-test-subj="alertsFlyoutViewInAppButton"
                fill
              >
                {translations.alertsFlyout.viewInAppButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsFlyout;
