/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';

import {
  CountriesQueryTabBody,
  DnsQueryTabBody,
  HttpQueryTabBody,
  IPsQueryTabBody,
  TlsQueryTabBody,
} from '.';
import { EventsQueryTabBody } from '../../../../common/components/events_tab';
import { AnomaliesNetworkTable } from '../../../../common/components/ml/tables/anomalies_network_table';
import { sourceOrDestinationIpExistsFilter } from '../../../../common/components/visualization_actions/utils';
import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';
import { TableId } from '../../../../../common/types';
import { ConditionalFlexGroup } from './conditional_flex_group';
import type { NetworkRoutesProps } from './types';
import { NetworkRouteType } from './types';
import { NETWORK_PATH } from '../../../../../common/constants';

export const NetworkRoutes = React.memo<NetworkRoutesProps>(
  ({ type, to, filterQuery, isInitializing, from, indexPattern, indexNames, setQuery }) => {
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
      setQuery,
      filterQuery,
    };

    const tabProps = {
      ...commonProps,
      indexPattern,
    };

    const anomaliesProps = {
      ...commonProps,
      anomaliesFilterQuery: networkAnomaliesFilterQuery,
      AnomaliesTableComponent: AnomaliesNetworkTable,
    };

    return (
      <Switch>
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.dns})`}>
          <DnsQueryTabBody {...tabProps} />
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
        <Route path={`${NETWORK_PATH}/:tabName(${NetworkRouteType.events})`}>
          <EventsQueryTabBody
            additionalFilters={sourceOrDestinationIpExistsFilter}
            tableId={TableId.networkPageEvents}
            {...tabProps}
          />
        </Route>
      </Switch>
    );
  }
);

NetworkRoutes.displayName = 'NetworkRoutes';
