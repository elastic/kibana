/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';
import { ActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';

export interface Props {
  activeAlerts?: ActiveAlerts;
  slo: SLOWithSummaryResponse;
}

export function SloActiveAlertsBadge({ slo, activeAlerts }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleActiveAlertsClick = () => {
    if (activeAlerts) {
      navigateToUrl(
        `${basePath.prepend(paths.observability.alerts)}?_a=(kuery:'slo.id:"${
          slo.id
        }"',rangeFrom:now-15m,rangeTo:now,status:active)`
      );
    }
  };

  if (!activeAlerts) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge
        iconType="warning"
        color="danger"
        onClick={handleActiveAlertsClick}
        onClickAriaLabel={i18n.translate(
          'xpack.observability.slo.slo.activeAlertsBadge.ariaLabel',
          { defaultMessage: 'active alerts badge' }
        )}
        data-test-subj="o11ySloActiveAlertsBadge"
      >
        {i18n.translate('xpack.observability.slo.slo.activeAlertsBadge.label', {
          defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
          values: { count: activeAlerts.count },
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
}
