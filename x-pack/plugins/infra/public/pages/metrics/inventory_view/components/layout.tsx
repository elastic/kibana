/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useInterval } from 'react-use';

import { euiPaletteColorBlind } from '@elastic/eui';
import { NodesOverview } from './nodes_overview';
import { Toolbar } from './toolbars/toolbar';
import { PageContent } from '../../../../components/page';
import { useSnapshot } from '../hooks/use_snaphot';
import { useInventoryMeta } from '../hooks/use_inventory_meta';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useSourceContext } from '../../../../containers/source';
import { InfraFormatterType, InfraWaffleMapGradientLegend } from '../../../../lib/lib';

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
  const { accounts, regions } = useInventoryMeta(sourceId, nodeType);
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

  return (
    <>
      <Toolbar accounts={accounts} regions={regions} nodeType={nodeType} />
      <PageContent>
        <NodesOverview
          nodes={nodes}
          options={options}
          nodeType={nodeType}
          loading={loading}
          reload={reload}
          onDrilldown={applyFilterQuery}
          currentTime={currentTime}
          onViewChange={changeView}
          view={view}
          autoBounds={autoBounds}
          boundsOverride={boundsOverride}
          interval={interval}
        />
      </PageContent>
    </>
  );
};
