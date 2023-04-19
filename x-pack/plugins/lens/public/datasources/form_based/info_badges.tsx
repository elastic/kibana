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
import { FormBasedLayer } from '../..';
import { FramePublicAPI, VisualizationInfo } from '../../types';
import { getSamplingValue } from './utils';

export function ReducedSamplingSectionEntries({
  layers,
  visualizationInfo,
  dataViews,
}: {
  layers: Array<[string, FormBasedLayer]>;
  visualizationInfo: VisualizationInfo;
  dataViews: FramePublicAPI['dataViews'];
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {layers.map(([id, layer], layerIndex) => {
        const dataView = dataViews.indexPatterns[layer.indexPatternId];
        const layerInfo = visualizationInfo.layers.find(({ layerId, label }) => layerId === id);
        const layerTitle =
          layerInfo?.label ||
          i18n.translate('xpack.lens.indexPattern.samplingPerLayer.fallbackLayerName', {
            defaultMessage: 'Data layer',
          });
        const layerPalette = layerInfo?.palette;
        return (
          <li
            key={`${layerTitle}-${dataView}-${layerIndex}`}
            data-test-subj={`lns-feature-badges-reducedSampling-${layerIndex}`}
            css={css`
              margin: ${euiTheme.size.base} 0 0;
            `}
          >
            <EuiFlexGroup justifyContent={layerPalette ? 'center' : 'spaceBetween'} gutterSize="s">
              {layerPalette ? (
                <EuiFlexItem grow={false}>
                  {layerPalette.length === 1 ? (
                    <EuiIcon color={layerPalette[0]} type="stopFilled" />
                  ) : (
                    <EuiIcon type="color" />
                  )}
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={Boolean(layerPalette)}>
                <EuiText size="s">{layerTitle}</EuiText>
                {layerPalette && layerPalette.length > 1 ? (
                  <EuiColorPaletteDisplay size="xs" palette={layerPalette} />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={css`
                  padding-right: 0;
                `}
              >
                <EuiText size="s">{`${Number(getSamplingValue(layer)) * 100}%`}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </li>
        );
      })}
    </>
  );
}
