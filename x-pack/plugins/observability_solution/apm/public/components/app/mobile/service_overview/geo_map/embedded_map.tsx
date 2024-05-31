/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { ApmPluginStartDeps } from '../../../../../plugin';
import { getLayerList } from './map_layers/get_layer_list';
import { MapTypes } from '../../../../../../common/mobile/constants';

function EmbeddedMapComponent({
  selectedMap,
  start,
  end,
  kuery = '',
  filters,
  dataView,
}: {
  selectedMap: MapTypes;
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
  dataView?: DataView;
}) {
  const { maps } = useKibana<ApmPluginStartDeps>().services;

  const layerList = useMemo(() => {
    return dataView?.id
      ? getLayerList({
          selectedMap,
          maps,
          dataViewId: dataView?.id,
        })
      : [];
  }, [selectedMap, maps, dataView?.id]);

  return (
    <div
      data-test-subj="serviceOverviewEmbeddedMap"
      style={{ width: '100%', height: '500px', display: 'flex', flex: '1 1 100%', zIndex: 1 }}
    >
      {maps &&
        maps.Map({
          title: i18n.translate('xpack.apm.serviceOverview.embeddedMap.input.title', {
            defaultMessage: 'Latency by country',
          }),
          filters,
          query: {
            query: kuery,
            language: 'kuery',
          },
          timeRange: {
            from: start,
            to: end,
          },
          layerList,
          hideFilterActions: true,
          isLayerTOCOpen: false,
          mapCenter: { lat: 20.43425, lon: 0, zoom: 1.25 },
        })}
    </div>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
