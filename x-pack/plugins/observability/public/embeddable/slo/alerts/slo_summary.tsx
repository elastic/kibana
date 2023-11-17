/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiText, EuiFlexItem, EuiPanel, EuiStat, EuiBadge } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { EmbeddableSloProps } from './types';
type SloIdAndInstanceId = [string, string];

export function SloSummary({ slos }: EmbeddableSloProps) {
  const sloBadges = slos.map((slo) =>
    slo.instanceId !== ALL_VALUE ? `${slo.name} (${slo.instanceId})` : slo.name
  );
  const more = sloBadges.length - 1;
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slos
      .map((slo) => ({
        id: slo.id,
        instanceId: slo.instanceId,
      }))
      .map(Object.values) as SloIdAndInstanceId[],
  });
  const totalActiveAlerts = slos.reduce((total, slo) => {
    if (activeAlerts && activeAlerts.get(slo)) {
      total += activeAlerts.get(slo)!;
    }
    return total;
  }, 0);
  return (
    <EuiPanel color="danger" hasShadow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" direction="column" style={{ minHeight: '100%' }}>
        <EuiFlexGroup direction="column" justifyContent="flexStart" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText color="default" size="m">
              <h3>
                {i18n.translate('xpack.observability.sloSummary.h5.activeAlertsLabel', {
                  defaultMessage: 'Active Alerts',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            gutterSize="xs"
            justifyContent="flexStart"
            responsive={false}
          >
            <EuiFlexItem grow={false} style={{ maxWidth: '150px' }}>
              <EuiBadge color={euiLightVars.euiColorDisabled}>{sloBadges[0]}</EuiBadge>
            </EuiFlexItem>
            {more > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={euiLightVars.euiColorDisabled}>{`+${more} more`}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiStat
              title={totalActiveAlerts}
              titleColor="default"
              titleSize="l"
              textAlign="right"
              isLoading={false}
              data-test-subj="sloAlertsSummaryStat"
              description=""
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
