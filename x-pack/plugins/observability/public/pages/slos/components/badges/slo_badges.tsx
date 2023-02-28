/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../../utils/kibana_react';
import { paths } from '../../../../config';
import { ActiveAlerts } from '../../../../hooks/slo/use_fetch_active_alerts';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';

export interface Props {
  slo: SLOWithSummaryResponse;
  activeAlerts?: ActiveAlerts;
}

export function SloBadges({ slo, activeAlerts }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleClick = () => {
    if (activeAlerts) {
      navigateToUrl(
        `${basePath.prepend(paths.observability.alerts)}?_a=${toAlertsPageQuery(activeAlerts)}`
      );
    }
  };

  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
      <SloStatusBadge slo={slo} />
      <EuiFlexItem grow={false}>
        <SloIndicatorTypeBadge slo={slo} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SloTimeWindowBadge slo={slo} />
      </EuiFlexItem>
      {!!activeAlerts && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            iconType="alert"
            color="danger"
            onClick={handleClick}
            onClickAriaLabel={i18n.translate(
              'xpack.observability.slo.slo.activeAlertsBadge.ariaLabel',
              { defaultMessage: 'active alerts badge' }
            )}
            data-test-subj="o11ySlosPageSloActiveAlertsBadge"
          >
            {i18n.translate('xpack.observability.slo.slo.activeAlertsBadge.label', {
              defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
              values: { count: activeAlerts.count },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function toAlertsPageQuery(activeAlerts: ActiveAlerts): string {
  const kuery = activeAlerts.ruleIds
    .map((ruleId) => `kibana.alert.rule.uuid:"${activeAlerts.ruleIds[0]}"`)
    .join(' or ');

  const query = `(kuery:'${kuery}',rangeFrom:now-15m,rangeTo:now,status:all)`;
  return query;
}
