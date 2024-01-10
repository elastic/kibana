/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { LoadWhenInView } from '@kbn/observability-shared-plugin/public';
import { Map, TileLayer } from 'react-leaflet';
import { I18LABELS } from './translations';
import { UXMetrics } from './ux_metrics';
import { ImpactfulMetrics } from './impactful_metrics';
import { PageLoadAndViews } from './panels/page_load_and_views';
import { VisitorBreakdownsPanel } from './panels/visitor_breakdowns';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ClientMetrics } from './client_metrics';

export function RumDashboard() {
  const { isSmall } = useBreakpoints();

  return (
    <EuiFlexGroup direction={isSmall ? 'row' : 'column'} gutterSize="s">
      <EuiFlexItem>
        <ClientMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <UXMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <PageLoadAndViews />
      </EuiFlexItem>
      <EuiFlexItem>
        <LoadWhenInView
          initialHeight={300}
          placeholderTitle={I18LABELS.pageLoadDurationByRegion}
        >
          <VisitorBreakdownsPanel />
        </LoadWhenInView>
      </EuiFlexItem>
      <EuiFlexItem>
        <LoadWhenInView
          initialHeight={300}
          placeholderTitle={I18LABELS.jsErrors}
        >
          <ImpactfulMetrics />
        </LoadWhenInView>
      </EuiFlexItem>
      <EuiFlexItem>
        <Map center={[0, 0]} zoom={13}>
          <HeatmapLayer
            fitBoundsOnLoad
            fitBoundsOnUpdate
            points={addressPoints}
            longitudeExtractor={(m) => m[1]}
            latitudeExtractor={(m) => m[0]}
            intensityExtractor={(m) => parseFloat(m[2])}
          />
          <TileLayer
            url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
        </Map>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
