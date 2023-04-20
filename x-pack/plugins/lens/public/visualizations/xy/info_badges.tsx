/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
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
        const layerInfo = visualizationInfo.layers.find(({ layerId }) => layerId === layer.layerId);
        const layerTitle =
          layerInfo?.label ||
          i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
            defaultMessage: 'Annotations',
          });
        const layerPalette = layerInfo?.palette;
        return (
          <li
            key={`${layerTitle}-${dataView}-${layerIndex}`}
            data-test-subj={`lns-feature-badges-ignoreGlobalFilters-${layerIndex}`}
            css={css`
              margin: ${euiTheme.size.base} 0 0;
            `}
          >
            <EuiFlexGroup justifyContent={layerPalette ? 'center' : 'spaceBetween'} gutterSize="s">
              {layerPalette ? (
                <EuiFlexItem grow={false}>
                  {layerPalette.length === 1 ? (
                    <EuiIcon
                      color={layerPalette[0]}
                      type="stopFilled"
                      css={css`
                        margin-top: 2px;
                      `}
                    />
                  ) : (
                    <EuiIcon
                      type="color"
                      css={css`
                        margin-top: 2px;
                      `}
                    />
                  )}
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem
                grow={Boolean(layerPalette)}
                css={css`
                  width: 150px;
                `}
              >
                <EuiText size="s">{layerTitle}</EuiText>
                {layerPalette && layerPalette.length > 1 ? (
                  <EuiColorPaletteDisplay
                    size="xs"
                    palette={layerPalette}
                    css={css`
                      margin-top: 4px;
                      width: 150px;
                    `}
                  />
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </li>
        );
      })}
    </>
  );
}
