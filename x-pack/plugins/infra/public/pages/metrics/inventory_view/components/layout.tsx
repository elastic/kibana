/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useInterval } from 'react-use';

import { euiPaletteColorBlind, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { convertIntervalToString } from '../../../../utils/convert_interval_to_string';
import { NodesOverview, calculateBoundsFromNodes } from './nodes_overview';
import { PageContent } from '../../../../components/page';
import { useSnapshot } from '../hooks/use_snaphot';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useSourceContext } from '../../../../containers/source';
import { InfraFormatterType, InfraWaffleMapGradientLegend } from '../../../../lib/lib';
import { euiStyled } from '../../../../../../observability/public';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { SavedViews } from './saved_views';
import { IntervalLabel } from './waffle/interval_label';
import { Legend } from './waffle/legend';
import { createInventoryMetricFormatter } from '../lib/create_inventory_metric_formatter';

const euiVisColorPalette = euiPaletteColorBlind();

export const Layout = () => {
  const { sourceId, source } = useSourceContext();
  const {
    metric,
    groupBy,
    nodeType,
    accountId,
    region,
    changeView,
    view,
    autoBounds,
    boundsOverride,
  } = useWaffleOptionsContext();
  const { currentTime, jumpToTime, isAutoReloading } = useWaffleTimeContext();
  const { filterQueryAsJson, applyFilterQuery } = useWaffleFiltersContext();
  const { loading, nodes, reload, interval } = useSnapshot(
    filterQueryAsJson,
    metric,
    groupBy,
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region
  );

  const options = {
    formatter: InfraFormatterType.percent,
    formatTemplate: '{{value}}',
    legend: {
      type: 'gradient',
      rules: [
        { value: 0, color: '#D3DAE6' },
        { value: 1, color: euiVisColorPalette[1] },
      ],
    } as InfraWaffleMapGradientLegend,
    metric,
    fields: source?.configuration?.fields,
    groupBy,
  };

  useInterval(
    () => {
      if (!loading) {
        jumpToTime(Date.now());
      }
    },
    isAutoReloading ? 5000 : null
  );

  const intervalAsString = convertIntervalToString(interval);
  const dataBounds = calculateBoundsFromNodes(nodes);
  const bounds = autoBounds ? dataBounds : boundsOverride;
  const formatter = useCallback(createInventoryMetricFormatter(options.metric), [options.metric]);

  return (
    <>
      <PageContent>
        <MainContainer>
          <TopActionContainer>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
              <Toolbar nodeType={nodeType} />
              <EuiFlexItem grow={false}>
                <ViewSwitcher view={view} onChange={changeView} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </TopActionContainer>
          <NodesOverview
            nodes={nodes}
            options={options}
            nodeType={nodeType}
            loading={loading}
            reload={reload}
            onDrilldown={applyFilterQuery}
            currentTime={currentTime}
            view={view}
            autoBounds={autoBounds}
            boundsOverride={boundsOverride}
            formatter={formatter}
          />
          <BottomActionContainer>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <SavedViews />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ position: 'relative', minWidth: 400 }}>
                <Legend
                  formatter={formatter}
                  bounds={bounds}
                  dataBounds={dataBounds}
                  legend={options.legend}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <IntervalLabel intervalAsString={intervalAsString} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </BottomActionContainer>
        </MainContainer>
      </PageContent>
    </>
  );
};

const MainContainer = euiStyled.div`
  position: relative;
  flex: 1 1 auto;
`;

const TopActionContainer = euiStyled.div`
  padding: ${props => `12px ${props.theme.eui.paddingSizes.m}`};
`;

const BottomActionContainer = euiStyled.div`
  background-color: ${props => props.theme.eui.euiPageBackgroundColor};
  padding: ${props => props.theme.eui.paddingSizes.m} ${props =>
  props.theme.eui.paddingSizes.m} ${props => props.theme.eui.paddingSizes.s};
  position: absolute;
  left: 0;
  bottom: 4px;
  right: 0;
`;
