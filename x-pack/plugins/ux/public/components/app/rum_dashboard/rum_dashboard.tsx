/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { LoadWhenInView } from '@kbn/observability-shared-plugin/public';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { I18LABELS } from './translations';
import { UXMetrics } from './ux_metrics';
import { ImpactfulMetrics } from './impactful_metrics';
import { PageLoadAndViews } from './panels/page_load_and_views';
import { VisitorBreakdownsPanel } from './panels/visitor_breakdowns';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ClientMetrics } from './client_metrics';

const position = [51.505, -0.09];

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
        <MapContainer center={position} zoom={13} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              {i18n.translate(
                'xpack.ux.rumDashboard.popup.aPrettyCSSPopupLabel',
                { defaultMessage: 'A pretty CSS popup' }
              )}
              <br />{' '}
              {i18n.translate(
                'xpack.ux.rumDashboard.popup.easilyCustomizableLabel',
                { defaultMessage: 'Easily customizable' }
              )}
            </Popup>
          </Marker>
        </MapContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
