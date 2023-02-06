/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
} from '@kbn/embeddable-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
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
}: {
  selectedMap: MapTypes;
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
}) {
  const [error, setError] = useState<boolean>();

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const {
    embeddable: embeddablePlugin,
    maps,
    notifications,
  } = useKibana<ApmPluginStartDeps>().services;

  useEffect(() => {
    async function setupEmbeddable() {
      const factory = embeddablePlugin?.getEmbeddableFactory<
        MapEmbeddableInput,
        MapEmbeddableOutput,
        MapEmbeddable
      >(MAP_SAVED_OBJECT_TYPE);

      if (!factory) {
        setError(true);
        notifications?.toasts.addDanger({
          title: i18n.translate(
            'xpack.apm.serviceOverview.embeddedMap.error.toastTitle',
            {
              defaultMessage: 'An error occurred when adding map embeddable',
            }
          ),
          text: i18n.translate(
            'xpack.apm.serviceOverview.embeddedMap.error.toastDescription',
            {
              defaultMessage: `Embeddable factory with id "{embeddableFactoryId}" was not found.`,
              values: {
                embeddableFactoryId: MAP_SAVED_OBJECT_TYPE,
              },
            }
          ),
        });
        return;
      }

      const input: MapEmbeddableInput = {
        attributes: { title: '' },
        id: uuidv4(),
        title: i18n.translate(
          'xpack.apm.serviceOverview.embeddedMap.input.title',
          {
            defaultMessage: 'Latency by country',
          }
        ),
        filters,
        viewMode: ViewMode.VIEW,
        mapCenter: { lat: 20.43425, lon: 0, zoom: 1.25 },
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
    const setLayerList = async () => {
      if (embeddable && !isErrorEmbeddable(embeddable)) {
        const layerList = await getLayerList({ selectedMap, maps });
        await Promise.all([
          embeddable.setLayerList(layerList),
          embeddable.reload(),
        ]);
      }
    };

    setLayerList();
  }, [embeddable, selectedMap, maps]);

  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput({
        filters,
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
  }, [start, end, kuery, filters, embeddable, selectedMap]);

  return (
    <>
      {error && (
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.apm.serviceOverview.embeddedMap.error', {
              defaultMessage: 'Could not load map',
            })}
          </p>
        </EuiText>
      )}
      {!error && (
        <div
          data-test-subj="serviceOverviewEmbeddedMap"
          css={css`
            width: 100%;
            height: 500px;
            display: flex;
            flex: 1 1 100%;
            z-index: 1;
            min-height: 0;
          `}
          ref={embeddableRoot}
        />
      )}
    </>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
