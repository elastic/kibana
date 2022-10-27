/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import uuid from 'uuid';
import {
  MapEmbeddable,
  MapEmbeddableInput,
  MapEmbeddableOutput,
} from '@kbn/maps-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/common';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ApmPluginStartDeps } from '../../../../../plugin';
import { getLayerList } from './get_layer_list';
import { useMapFilters } from './use_map_filters';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../../hooks/use_time_range';

export function EmbeddedMapComponent() {
  const {
    query: { rangeFrom, rangeTo, kuery },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const mapFilters = useMapFilters();

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const { embeddable: embeddablePlugin, maps } =
    useKibana<ApmPluginStartDeps>().services;

  if (!embeddablePlugin) {
    throw new Error('Embeddable plugin not found');
  }

  if (!embeddablePlugin) {
    throw new Error('Maps plugin not found');
  }

  useEffect(() => {
    async function setupEmbeddable() {
      const factory:
        | EmbeddableFactory<
            MapEmbeddableInput,
            MapEmbeddableOutput,
            MapEmbeddable
          >
        | undefined = embeddablePlugin.getEmbeddableFactory(
        MAP_SAVED_OBJECT_TYPE
      );

      if (!factory) {
        throw new Error('Map embeddable not found.');
      }

      const input: MapEmbeddableInput = {
        attributes: { title: '' },
        id: uuid.v4(),
        title: i18n.translate(
          'xpack.apm.serviceOverview.embeddedMap.input.title',
          {
            defaultMessage: 'Latency by country',
          }
        ),
        filters: mapFilters,
        viewMode: ViewMode.VIEW,
        isLayerTOCOpen: false,
        query: {
          query: kuery,
          language: 'kuery',
        },
        timeRange: {
          from: start,
          to: end,
        },
        hideFilterActions: true,
      };

      const embeddableObject = await factory.create(input);
      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        const layerList = await getLayerList(maps);
        await embeddableObject.setLayerList(layerList);
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();
    // Set up exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput({
        filters: mapFilters,
        query: {
          query: kuery,
          language: 'kuery',
        },
        timeRange: {
          from: start,
          to: end,
        },
      });
    }
  }, [start, end, kuery, mapFilters, embeddable]);

  return (
    <div
      data-test-subj="serviceOverviewEmbeddedMap"
      css={css`
        width: 100%;
        height: 400px;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
      ref={embeddableRoot}
    />
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
