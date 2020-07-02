/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FlowTargetSourceDest } from '../../../graphql/types';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';

import { IPsQueryTabBody } from './ips_query_tab_body';
import { CountriesQueryTabBody } from './countries_query_tab_body';
import { HttpQueryTabBody } from './http_query_tab_body';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesNetworkTable } from '../../../common/components/ml/tables/anomalies_network_table';
import { DnsQueryTabBody } from './dns_query_tab_body';
import { ConditionalFlexGroup } from './conditional_flex_group';
import { NetworkRoutesProps, NetworkRouteType } from './types';
import { TlsQueryTabBody } from './tls_query_tab_body';
import { Anomaly } from '../../../common/components/ml/types';
import { NetworkAlertsQueryTabBody } from './alerts_query_tab_body';
import { UpdateDateRange } from '../../../common/components/charts/common';

export const NetworkRoutes = React.memo<NetworkRoutesProps>(
  ({
    networkPagePath,
    type,
    to,
    filterQuery,
    isInitializing,
    from,
    indexPattern,
    setQuery,
    setAbsoluteRangeDatePicker,
  }) => {
    const narrowDateRange = useCallback(
      (score: Anomaly, interval: string) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      [setAbsoluteRangeDatePicker]
    );
    const updateDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    const networkAnomaliesFilterQuery = {
      bool: {
        should: [
          {
            exists: {
              field: 'source.ip',
            },
          },
          {
            exists: {
              field: 'destination.ip',
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    const commonProps = {
      startDate: from,
      endDate: to,
      skip: isInitializing,
      type,
      narrowDateRange,
      setQuery,
      filterQuery,
    };

    const tabProps = {
      ...commonProps,
      indexPattern,
      updateDateRange,
    };

    const anomaliesProps = {
      ...commonProps,
      anomaliesFilterQuery: networkAnomaliesFilterQuery,
      AnomaliesTableComponent: AnomaliesNetworkTable,
    };

    return (
      <Switch>
        <Route path={`/:tabName(${NetworkRouteType.dns})`}>
          <DnsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`/:tabName(${NetworkRouteType.flows})`}>
          <>
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <IPsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.destination} />
              </EuiFlexItem>
            </ConditionalFlexGroup>
            <EuiSpacer />
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <CountriesQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <CountriesQueryTabBody
                  {...tabProps}
                  flowTarget={FlowTargetSourceDest.destination}
                />
              </EuiFlexItem>
            </ConditionalFlexGroup>
          </>
        </Route>
        <Route path={`/:tabName(${NetworkRouteType.http})`}>
          <HttpQueryTabBody {...tabProps} />
        </Route>
        <Route path={`/:tabName(${NetworkRouteType.tls})`}>
          <TlsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
        </Route>
        <Route path={`/:tabName(${NetworkRouteType.anomalies})`}>
          <AnomaliesQueryTabBody
            {...anomaliesProps}
            AnomaliesTableComponent={AnomaliesNetworkTable}
          />
        </Route>
        <Route path={`/:tabName(${NetworkRouteType.alerts})`}>
          <NetworkAlertsQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

NetworkRoutes.displayName = 'NetworkRoutes';
