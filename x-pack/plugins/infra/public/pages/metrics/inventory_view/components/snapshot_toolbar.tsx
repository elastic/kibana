/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { InfraWaffleMapBounds } from '../../../../lib/lib';
import { DEFAULT_LEGEND, WaffleLegendOptions } from '../hooks/use_waffle_options';
import { Toolbar } from './toolbars/toolbar';
import { LegendControls } from './waffle/legend_controls';
import { ViewSwitcher } from './waffle/view_switcher';

import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';
import { useSnapshotModeContext } from '../hooks/use_snapshot_mode';
import { SavedViews } from './saved_views';

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
  legend: WaffleLegendOptions;
}

export function SnapshotToolbar() {
  const {
    nodeType,
    legend,
    view,
    changeView,
    autoBounds,
    boundsOverride,
    changeBoundsOverride,
    changeAutoBounds,
    changeLegend,
  } = useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();
  const { nodes } = useSnapshotModeContext();

  const dataBounds = calculateBoundsFromNodes(nodes);
  const bounds = autoBounds ? dataBounds : boundsOverride;

  const handleLegendControlChange = useCallback(
    (opts: LegendControlOptions) => {
      changeBoundsOverride(opts.bounds);
      changeAutoBounds(opts.auto);
      changeLegend(opts.legend);
    },
    [changeBoundsOverride, changeAutoBounds, changeLegend]
  );

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
      <Toolbar nodeType={nodeType} currentTime={currentTime} />

      <EuiFlexGroup css={{ justifyContent: 'flex-end' }} gutterSize="s">
        <EuiFlexItem grow={false}>
          <SavedViews />
        </EuiFlexItem>
        {view === 'map' && (
          <EuiFlexItem grow={false}>
            <LegendControls
              options={legend != null ? legend : DEFAULT_LEGEND}
              dataBounds={dataBounds}
              bounds={bounds}
              autoBounds={autoBounds}
              boundsOverride={boundsOverride}
              onChange={handleLegendControlChange}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ViewSwitcher view={view} onChange={changeView} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
