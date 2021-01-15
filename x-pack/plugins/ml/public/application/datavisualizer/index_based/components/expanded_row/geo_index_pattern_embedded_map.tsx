/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import uuid from 'uuid';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiOutsideClickDetector,
  EuiPopoverTitle,
} from '@elastic/eui';
import { useMlKibana } from '../../../../contexts/kibana';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
} from '../../../../../../../../../src/plugins/embeddable/public';
import {
  MapEmbeddable,
  MapEmbeddableInput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../maps/public/embeddable';
import { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types';
import {
  ES_GEO_FIELD_TYPE,
  MAP_SAVED_OBJECT_TYPE,
} from '../../../../../../../maps/common/constants';
import { RenderTooltipContentParams } from '../../../../../../../maps/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CreateLayerDescriptorParams } from '../../../../../../../maps/public/classes/sources/es_search_source';
import { FieldVisConfig } from '../../../stats_table/types';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';

type MapToolTipProps = Partial<RenderTooltipContentParams>;

function MapToolTipComponent({
  closeTooltip,
  features = [],
  loadFeatureProperties,
}: MapToolTipProps) {
  const { id: featureId, layerId } = features[0] ?? {};

  useEffect(() => {
    const loadRegionInfo = async () => {
      if (loadFeatureProperties) {
        const items = await loadFeatureProperties({ layerId, featureId });
        // console.log('layerId, featureId', layerId, featureId);
        //
        items.forEach((item) => {
          // if (item.getPropertyKey() === COUNTRY_NAME || item.getPropertyKey() === REGION_NAME) {
          //   setRegionName(item.getRawValue() as string);
          // }
          // if (
          //   item.getPropertyKey() === TRANSACTION_DURATION_REGION ||
          //   item.getPropertyKey() === TRANSACTION_DURATION_COUNTRY
          // ) {
          //   setPageLoadDuration(formatPageLoadValue(+(item.getRawValue() as string)));
          // }
        });
      }
    };
    loadRegionInfo();
  });

  return (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        if (closeTooltip != null) {
          closeTooltip();
        }
      }}
    >
      <>
        <EuiPopoverTitle>Test</EuiPopoverTitle>
        <EuiDescriptionList
          type="column"
          textStyle="reverse"
          compressed={true}
          style={{ width: 300 }}
        >
          <EuiDescriptionListTitle>description title</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>description</EuiDescriptionListDescription>
        </EuiDescriptionList>
      </>
    </EuiOutsideClickDetector>
  );
}

export const MapToolTip = React.memo(MapToolTipComponent);

export function EmbeddedMapComponent({
  config,
  indexPattern,
  combinedQuery,
}: {
  config: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
}) {
  const [embeddable, setEmbeddable] = useState<MapEmbeddable | ErrorEmbeddable | undefined>();

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const layerList = useRef<LayerDescriptor[]>([]);

  const {
    services: { embeddable: embeddablePlugin, maps: mapsPlugin },
  } = useMlKibana();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  if (!mapsPlugin) {
    throw new Error('Maps start plugin not found');
  }

  const factory: any = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    id: uuid.v4(),
    attributes: { title: '' },
    filters: [],
    hidePanelTitles: true,
    refreshConfig: {
      value: 0,
      pause: false,
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    hideFilterActions: true,
    // Zoom Lat/Lon values are set to make sure map is in center in the panel
    // It wil also omit Greenland/Antarctica etc
    mapCenter: {
      lon: 11,
      lat: 20,
      zoom: 0,
    },
    disableInteractive: false,
    hideToolbarOverlay: true,
    hideLayerControl: true,
    hideViewControl: false,
  };

  const renderTooltipContent = ({
    closeTooltip,
    features,
    loadFeatureProperties,
  }): RenderTooltipContentParams => {
    return (
      <MapToolTip
        closeTooltip={closeTooltip}
        features={features}
        loadFeatureProperties={loadFeatureProperties}
      />
    );
  };

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function updateIndexPatternSearchLayer() {
      if (
        embeddable &&
        !isErrorEmbeddable(embeddable) &&
        indexPattern?.id !== undefined &&
        config !== undefined &&
        config.fieldName !== undefined &&
        config.type === ML_JOB_FIELD_TYPES.GEO_POINT
      ) {
        const params: CreateLayerDescriptorParams = {
          indexPatternId: indexPattern.id,
          geoFieldName: config.fieldName,
          geoFieldType: config.type as ES_GEO_FIELD_TYPE.GEO_POINT,
          query: {
            query: combinedQuery.searchString,
            language: combinedQuery.searchQueryLanguage,
          },
        };
        const searchLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor(params)
          : null;
        if (searchLayerDescriptor) {
          layerList.current = [...layerList.current, searchLayerDescriptor];
          embeddable.setLayerList(layerList.current);
        }
      }
    }
    updateIndexPatternSearchLayer();
  }, [embeddable, indexPattern, config.fieldName, combinedQuery]);

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
      const embeddableObject: any = await factory.create({
        ...input,
        title: 'Data visualizer map',
      });

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        embeddableObject.setRenderTooltipContent(renderTooltipContent);
        const basemapLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createBasemapLayerDescriptor()
          : null;

        if (basemapLayerDescriptor) {
          layerList.current = [basemapLayerDescriptor];
          await embeddableObject.setLayerList(layerList.current);
        }
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();

    // we want this effect to execute exactly once after the component mounts
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <div
      className={'mlFieldDataCard__geoContent'}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 300,
      }}
    >
      <div
        data-test-subj="xpack.ml.datavisualizer.embeddedMapPanel"
        className="embPanel__content"
        ref={embeddableRoot}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flex: '1 1 100%',
          zIndex: 1,
          minHeight: 0, // Absolute must for Firefox to scroll contents
        }}
      />
    </div>
  );
}
