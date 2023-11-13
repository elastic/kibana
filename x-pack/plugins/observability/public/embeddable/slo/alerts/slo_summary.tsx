/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiText, EuiFlexItem, EuiPanel, EuiStat, EuiBadge } from '@elastic/eui';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';

import { EmbeddableSloProps } from './types';

export function SloSummary({ slos, lastReloadRequestTime }: EmbeddableSloProps) {
  const sloNames = slos.map((slo) => `${slo.name}(${slo.instanceId})`);
  const more = sloNames.length - 1;
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slos.map(Object.values),
  });
  const totalActiveAlerts = slos.reduce((total, slo) => {
    if (activeAlerts.get(slo)) {
      total += activeAlerts.get(slo);
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
              <EuiBadge color="danger">{sloNames[0]}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">{`+${more} more`}</EuiBadge>
            </EuiFlexItem>
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
