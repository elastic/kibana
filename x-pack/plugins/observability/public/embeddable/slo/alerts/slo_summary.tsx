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
  // const { data: activeAlerts } = useFetchActiveAlerts({
  //   sloIdsAndInstanceIds: [
  //     // ['2f3f52a0-7b60-11ee-8f2d-95d71754a584', '*'],
  //     // ['4776bb30-7bb3-11ee-8f2d-95d71754a584', '*'],
  //     ['9270f550-7b5f-11ee-8f2d-95d71754a584', '*'],
  //   ],
  // });
  const sloNames = slos.map((slo) => `${slo.name}(${slo.instanceId})`); // TODO hide *
  console.log(sloNames, '!!names');
  const more = sloNames.length - 1;
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slos.map(Object.values),
  });
  console.log(activeAlerts, '!!activeAlerts');
  console.log(slos.map(Object.values));
  const y = slos.map(Object.values);
  // useEffect(() => {
  //   refetch();
  // }, [lastReloadRequestTime, refetch]);
  let numOfAlerts = 0;
  slos.forEach((slo) => {
    if (activeAlerts.get(slo)) {
      numOfAlerts = numOfAlerts + activeAlerts.get(slo);
    }
  });
  return (
    <EuiPanel color="danger" hasShadow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" direction="column" style={{ minHeight: '100%' }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText color="default" size="m">
              <h3>
                {i18n.translate('xpack.observability.sloSummary.h5.activeAlertsLabel', {
                  defaultMessage: 'Active Alerts',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiBadge color="danger">{sloNames[0]}</EuiBadge>
            <EuiBadge color="danger">{`+${more} more`}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiStat
              title={numOfAlerts}
              titleColor="default"
              titleSize="l"
              textAlign="right"
              isLoading={false}
              data-test-subj="sloDetailsBurnRateStat"
              description=""
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
