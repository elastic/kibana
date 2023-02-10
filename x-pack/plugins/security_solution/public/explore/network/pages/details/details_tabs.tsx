/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { DataViewBase, Filter } from '@kbn/es-query';
import { Route } from '@kbn/kibana-react-plugin/public';
import { TableId } from '../../../../../common/types';
import { AnomaliesNetworkTable } from '../../../../common/components/ml/tables/anomalies_network_table';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';
import { EventsQueryTabBody } from '../../../../common/components/events_tab/events_query_tab_body';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';

import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';

import { NETWORK_DETAILS_PAGE_PATH } from '../constants';

import {
  CountriesQueryTabBody,
  HttpQueryTabBody,
  IPsQueryTabBody,
  TlsQueryTabBody,
  UsersQueryTabBody,
} from '../navigation';
import { ConditionalFlexGroup } from '../navigation/conditional_flex_group';
import { networkModel } from '../../store';
import { NetworkDetailsRouteType } from './types';

interface NetworkDetailTabsProps {
  ip: string;
  endDate: string;
  startDate: string;
  filterQuery: string | undefined;
  indexNames: string[];
  skip: boolean;
  setQuery: GlobalTimeArgs['setQuery'];
  indexPattern: DataViewBase;
  flowTarget: FlowTargetSourceDest;
  networkDetailsFilter: Filter[];
}

export const NetworkDetailsTabs = React.memo<NetworkDetailTabsProps>(
  ({ flowTarget, indexPattern, networkDetailsFilter, ...rest }) => {
    const type = networkModel.NetworkType.details;

    const commonProps = { ...rest, type };
    const flowTabProps = { ...commonProps, indexPattern };
    const commonPropsWithFlowTarget = { ...commonProps, flowTarget };

    return (
      <Switch>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.flows})`}
        >
          <>
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <IPsQueryTabBody {...flowTabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <IPsQueryTabBody {...flowTabProps} flowTarget={FlowTargetSourceDest.destination} />
              </EuiFlexItem>
            </ConditionalFlexGroup>
            <EuiSpacer />
            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <CountriesQueryTabBody {...flowTabProps} flowTarget={FlowTargetSourceDest.source} />
              </EuiFlexItem>

              <EuiFlexItem>
                <CountriesQueryTabBody
                  {...flowTabProps}
                  flowTarget={FlowTargetSourceDest.destination}
                />
              </EuiFlexItem>
            </ConditionalFlexGroup>
          </>
        </Route>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.users})`}
        >
          <UsersQueryTabBody {...commonPropsWithFlowTarget} />
        </Route>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.http})`}
        >
          <HttpQueryTabBody {...commonProps} />
        </Route>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.tls})`}
        >
          <TlsQueryTabBody {...commonPropsWithFlowTarget} />
        </Route>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.anomalies})`}
        >
          <AnomaliesQueryTabBody
            {...commonPropsWithFlowTarget}
            hideHistogramIfEmpty={true}
            AnomaliesTableComponent={AnomaliesNetworkTable}
          />
        </Route>
        <Route
          path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget/:tabName(${NetworkDetailsRouteType.events})`}
        >
          <EventsQueryTabBody
            additionalFilters={networkDetailsFilter}
            {...commonProps}
            tableId={TableId.networkPageEvents}
          />
        </Route>
      </Switch>
    );
  }
);

NetworkDetailsTabs.displayName = 'UsersDetailsTabs';
