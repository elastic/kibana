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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_SEVERITY_LEVEL,
  ALERT_UUID,
  RULE_CATEGORY,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';
import moment from 'moment-timezone';
import React, { useMemo } from 'react';
import type { TopAlertResponse } from '../';
import { useKibana, useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';
import { asDuration } from '../../../../common/utils/formatters';
import type { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import { decorateResponse } from '../decorate_response';
import { SeverityBadge } from '../severity_badge';

type AlertsFlyoutProps = {
  alerts?: TopAlertResponse[];
  isInApp?: boolean;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  selectedAlertId?: string;
} & EuiFlyoutProps;

export function AlertsFlyout({
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
    return decorateResponse(alerts ?? [], observabilityRuleTypeRegistry);
  }, [alerts, observabilityRuleTypeRegistry]);
  const alert = decoratedAlerts?.find((a) => a.fields[ALERT_UUID] === selectedAlertId);

  if (!alert) {
    return null;
  }

  const overviewListItems = [
    {
      title: i18n.translate('xpack.observability.alertsFlyout.statusLabel', {
        defaultMessage: 'Status',
      }),
      description: alert.active ? 'Active' : 'Recovered',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.severityLabel', {
        defaultMessage: 'Severity',
      }),
      description: <SeverityBadge severityLevel={alert.fields[ALERT_SEVERITY_LEVEL]} />,
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.triggeredLabel', {
        defaultMessage: 'Triggered',
      }),
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.durationLabel', {
        defaultMessage: 'Duration',
      }),
      description: asDuration(alert.fields[ALERT_DURATION], { extended: true }),
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.expectedValueLabel', {
        defaultMessage: 'Expected value',
      }),
      description: alert.fields[ALERT_EVALUATION_THRESHOLD] ?? '-',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.actualValueLabel', {
        defaultMessage: 'Actual value',
      }),
      description: alert.fields[ALERT_EVALUATION_VALUE] ?? '-',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.ruleTypeLabel', {
        defaultMessage: 'Rule type',
      }),
      description: alert.fields[RULE_CATEGORY] ?? '-',
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>{alert.fields[RULE_NAME]}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{alert.reason}</EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          compressed={true}
          type="responsiveColumn"
          listItems={overviewListItems}
        />
      </EuiFlyoutBody>
      {alert.link && !isInApp && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton href={prepend && prepend(alert.link)} fill>
                View in app
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
