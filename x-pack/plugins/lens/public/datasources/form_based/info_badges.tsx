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
        const layerTitle =
          visualizationInfo.layers.find(({ layerId }) => layerId === id)?.label ||
          i18n.translate('xpack.lens.indexPattern.samplingPerLayer.fallbackLayerName', {
            defaultMessage: 'Data layer',
          });
        return (
          <li
            key={`${layerTitle}-${dataView}-${layerIndex}`}
            data-test-subj={`lns-feature-badges-reducedSampling-${layerIndex}`}
            css={css`
              margin: ${euiTheme.size.base} 0 0;
            `}
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText size="s">{layerTitle}</EuiText>
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
