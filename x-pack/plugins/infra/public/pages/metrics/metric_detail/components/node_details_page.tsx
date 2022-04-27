/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useContext } from 'react';
import dateMath from '@kbn/datemath';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Source } from '../../../../containers/metrics_source';
import { InventoryMetric, InventoryItemType } from '../../../../../common/inventory_models/types';
import { useNodeDetails } from '../hooks/use_node_details';
import { MetricsSideNav } from './side_nav';
import { MetricsTimeControls } from './time_controls';
import { SideNavContext, NavItem } from '../lib/side_nav_context';
import { PageBody } from './page_body';
import { MetricsTimeInput } from '../hooks/use_metrics_time';
import { InfraMetadata } from '../../../../../common/http_api/metadata_api';
import { PageError } from './page_error';
import { MetadataContext } from '../containers/metadata_context';
import { MetricsPageTemplate } from '../../page_template';

interface Props {
  name: string;
  requiredMetrics: InventoryMetric[];
  nodeId: string;
  cloudId: string;
  nodeType: InventoryItemType;
  sourceId: string;
  timeRange: MetricsTimeInput;
  metadataLoading: boolean;
  isAutoReloading: boolean;
  refreshInterval: number;
  sideNav: NavItem[];
  metadata: InfraMetadata;
  addNavItem(item: NavItem): void;
  setRefreshInterval(refreshInterval: number): void;
  setAutoReload(isAutoReloading: boolean): void;
  triggerRefresh(): void;
  setTimeRange(timeRange: MetricsTimeInput): void;
}

const parseRange = (range: MetricsTimeInput) => {
  const parsedFrom = dateMath.parse(range.from.toString());
  const parsedTo = dateMath.parse(range.to.toString(), { roundUp: true });
  return {
    ...range,
    from: (parsedFrom && parsedFrom.valueOf()) || moment().subtract(1, 'hour').valueOf(),
    to: (parsedTo && parsedTo.valueOf()) || moment().valueOf(),
  };
};

export const NodeDetailsPage = (props: Props) => {
  const { metricIndicesExist } = useContext(Source.Context);
  const [parsedTimeRange, setParsedTimeRange] = useState(parseRange(props.timeRange));
  const { metrics, loading, makeRequest, error } = useNodeDetails(
    props.requiredMetrics,
    props.nodeId,
    props.nodeType,
    props.sourceId,
    parsedTimeRange,
    props.cloudId
  );

  const refetch = useCallback(() => {
    setParsedTimeRange(parseRange(props.timeRange));
  }, [props.timeRange]);

  useEffect(() => {
    setParsedTimeRange(parseRange(props.timeRange));
  }, [props.timeRange]);

  useEffect(() => {
    makeRequest();
  }, [makeRequest, parsedTimeRange]);

  if (error) {
    return <PageError error={error} name={props.name} />;
  }

  return (
    <MetricsPageTemplate
      hasData={metricIndicesExist}
      pageHeader={{
        pageTitle: props.name,
        rightSideItems: [
          <MetricsTimeControls
            currentTimeRange={props.timeRange}
            isLiveStreaming={props.isAutoReloading}
            refreshInterval={props.refreshInterval}
            setRefreshInterval={props.setRefreshInterval}
            onChangeTimeRange={props.setTimeRange}
            setAutoReload={props.setAutoReload}
            onRefresh={refetch}
          />,
        ],
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <MetricsSideNav loading={props.metadataLoading} name={props.name} items={props.sideNav} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SideNavContext.Provider
            value={{
              items: props.sideNav,
              addNavItem: props.addNavItem,
            }}
          >
            <MetadataContext.Provider value={props.metadata}>
              <PageBody
                loading={metrics.length > 0 && props.isAutoReloading ? false : loading}
                refetch={refetch}
                type={props.nodeType}
                metrics={metrics}
                onChangeRangeTime={props.setTimeRange}
                isLiveStreaming={props.isAutoReloading}
                stopLiveStreaming={() => props.setAutoReload(false)}
              />
            </MetadataContext.Provider>
          </SideNavContext.Provider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </MetricsPageTemplate>
  );
};
