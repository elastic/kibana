/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutProps } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';

import { AlertsFlyoutHeader } from './alerts_flyout_header';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { AlertsFlyoutFooter } from './alerts_flyout_footer';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { TopAlert } from '../../typings/alerts';

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
  const decoratedAlerts = useMemo(() => {
    const parseObservabilityAlert = parseAlert(observabilityRuleTypeRegistry);
    return (alerts ?? []).map(parseObservabilityAlert);
  }, [alerts, observabilityRuleTypeRegistry]);

  let alertData = alert;
  if (!alertData) {
    alertData = decoratedAlerts?.find((a) => a.fields[ALERT_UUID] === selectedAlertId) as TopAlert;
  }
  if (!alertData) {
    return null;
  }

  return (
    <EuiFlyout className="oblt__flyout" onClose={onClose} size="s" data-test-subj="alertsFlyout">
      <EuiFlyoutHeader hasBorder>
        <AlertsFlyoutHeader alert={alertData} />
      </EuiFlyoutHeader>
      <AlertsFlyoutBody alert={alertData} />
      <AlertsFlyoutFooter alert={alertData} isInApp={isInApp} />
    </EuiFlyout>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsFlyout;
