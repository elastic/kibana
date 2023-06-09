/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { InfoBadge } from '../../shared_components/info_badges/info_badge';
import { FramePublicAPI, VisualizationInfo } from '../../types';
import { XYAnnotationLayerConfig } from './types';

export function IgnoredGlobalFiltersEntries({
  layers,
  visualizationInfo,
  dataViews,
}: {
  layers: XYAnnotationLayerConfig[];
  visualizationInfo: VisualizationInfo;
  dataViews: FramePublicAPI['dataViews'];
}) {
  return (
    <>
      {layers.map((layer, layerIndex) => {
        const dataView = dataViews.indexPatterns[layer.indexPatternId];
        const layerInfo = visualizationInfo.layers.find(({ layerId }) => layerId === layer.layerId);
        const layerTitle =
          layerInfo?.label ||
          i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
            defaultMessage: 'Annotations',
          });
        const layerPalette = layerInfo?.palette;
        return (
          <InfoBadge
            title={layerTitle}
            index={layerIndex}
            dataView={dataView.id}
            palette={layerPalette}
            data-test-subj-prefix="lns-feature-badges-ignoreGlobalFilters"
          />
        );
      })}
    </>
  );
}
