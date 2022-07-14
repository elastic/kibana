/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';

import {
  CountriesQueryTabBody,
  DnsQueryTabBody,
  HttpQueryTabBody,
  IPsQueryTabBody,
  NetworkAlertsQueryTabBody,
  TlsQueryTabBody,
} from '.';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesNetworkTable } from '../../../common/components/ml/tables/anomalies_network_table';
import { ConditionalFlexGroup } from './conditional_flex_group';
import type { NetworkRoutesProps } from './types';
import { NetworkRouteType } from './types';
import type { Anomaly } from '../../../common/components/ml/types';
import type { UpdateDateRange } from '../../../common/components/charts/common';
import { NETWORK_PATH } from '../../../../common/constants';

export const NetworkRoutes = React.memo<NetworkRoutesProps>(
  ({
    docValueFields,
    type,
    to,
    filterQuery,
    isInitializing,
    from,
    indexPattern,
    indexNames,
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
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        });
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
      indexNames,
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
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.dns})`}>
          <DnsQueryTabBody {...tabProps} docValueFields={docValueFields} />
        </Route>
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.flows})`}>
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
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.http})`}>
          <HttpQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.tls})`}>
          <TlsQueryTabBody {...tabProps} flowTarget={FlowTargetSourceDest.source} />
        </Route>
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.anomalies})`}>
          <AnomaliesQueryTabBody
            {...anomaliesProps}
            AnomaliesTableComponent={AnomaliesNetworkTable}
          />
        </Route>
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.alerts})`}>
          <NetworkAlertsQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

NetworkRoutes.displayName = 'NetworkRoutes';
