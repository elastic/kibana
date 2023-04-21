/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
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
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {layers.map((layer, layerIndex) => {
        const dataView = dataViews.indexPatterns[layer.indexPatternId];
        const layerTitle =
          visualizationInfo.layers.find(({ layerId, label }) => layerId === layer.layerId)?.label ||
          i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
            defaultMessage: 'Annotations',
          });
        return (
          <li
            key={`${layerTitle}-${dataView}-${layerIndex}`}
            data-test-subj={`lns-feature-badges-ignoreGlobalFilters-${layerIndex}`}
            css={css`
              margin: ${euiTheme.size.base} 0 0;
            `}
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText size="s">{layerTitle}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </li>
        );
      })}
    </>
  );
}
