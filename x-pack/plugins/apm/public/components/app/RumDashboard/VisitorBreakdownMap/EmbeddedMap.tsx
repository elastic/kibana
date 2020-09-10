/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useRef } from 'react';
import uuid from 'uuid';
import styled from 'styled-components';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import {
  MapEmbeddable,
  MapEmbeddableInput,
} from '../../../../../../maps/public/embeddable';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../../maps/common/constants';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
} from '../../../../../../../../src/plugins/embeddable/public';
import { getLayerList } from './LayerList';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { RenderTooltipContentParams } from '../../../../../../maps/public/classes/tooltips/tooltip_property';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { MapToolTipComponent } from './MapToolTip';

const EmbeddedPanel = styled.div`
  z-index: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  .embPanel__content {
    display: flex;
    flex: 1 1 100%;
    z-index: 1;
    min-height: 0; // Absolute must for Firefox to scroll contents
  }
  &&& .mapboxgl-canvas {
    animation: none !important;
  }
`;

interface KibanaDeps {
  embeddable: any;
}
export const EmbeddedMap = React.memo(() => {
  const { urlParams } = useUrlParams();

  const { start, end } = urlParams;

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<
    HTMLDivElement
  >(null);

  const {
    services: { embeddable: embeddablePlugin },
  } = useKibana<KibanaDeps>();

  const portalNode = React.useMemo(() => createPortalNode(), []);

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  const factory: any = embeddablePlugin.getEmbeddableFactory(
    MAP_SAVED_OBJECT_TYPE
  );

  const input: MapEmbeddableInput = {
    id: uuid.v4(),
    filters: [
      {
        meta: {
          index: 'apm_static_index_pattern_id',
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'transaction.marks.navigationTiming.fetchStart',
          value: 'exists',
        },
        exists: {
          field: 'transaction.marks.navigationTiming.fetchStart',
        },
      },
    ],
    refreshConfig: {
      value: 0,
      pause: false,
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    query: {
      query: 'transaction.type : "page-load"',
      language: 'kuery',
    },
    timeRange: {
      from: new Date(start!).toISOString(),
      to: new Date(end!).toISOString(),
    },
  };

  const renderTooltipContent = ({
    addFilters,
    closeTooltip,
    features,
    isLocked,
    getLayerName,
    loadFeatureProperties,
    loadFeatureGeometry,
  }: RenderTooltipContentParams) => {
    const props = {
      addFilters,
      closeTooltip,
      isLocked,
      getLayerName,
      loadFeatureProperties,
      loadFeatureGeometry,
    };

    return <OutPortal {...props} node={portalNode} features={features} />;
  };

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
      const embeddableObject: any = await factory.create({
        ...input,
        title: 'Visitors by region',
      });

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        embeddableObject.setRenderTooltipContent(renderTooltipContent);
        await embeddableObject.setLayerList(getLayerList());
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <EmbeddedPanel>
      <div
        data-test-subj="xpack.uptime.locationMap.embeddedPanel"
        className="embPanel__content"
        ref={embeddableRoot}
      />
      <InPortal node={portalNode}>
        <MapToolTipComponent />
      </InPortal>
    </EmbeddedPanel>
  );
});

EmbeddedMap.displayName = 'EmbeddedMap';
