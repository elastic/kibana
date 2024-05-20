/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getPanelTitle } from '@kbn/presentation-publishing';
import type { MapApi } from '@kbn/maps-plugin/public';
import { Layer } from './map_vis_layer_selection_flyout/layer';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_map';
import { VisualizationExtractor } from '../../../application/jobs/new_job/job_from_map';

interface Props {
  embeddable: MapApi;
  onClose: () => void;
}

export const GeoJobFlyout: FC<Props> = ({ onClose, embeddable }) => {
  const { euiTheme } = useEuiTheme();
  const [layerResults, setLayerResults] = useState<LayerResult[]>([]);

  useEffect(() => {
    const visExtractor = new VisualizationExtractor();
    visExtractor
      .getResultLayersFromEmbeddable(embeddable)
      .then(setLayerResults)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Layers could not be extracted from embeddable', error);
        onClose();
      });
  }, [embeddable, onClose]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.geoJobFlyout.secondTitle"
            defaultMessage="Create an anomaly detection lat_long job from map visualization {title}."
            values={{ title: getPanelTitle(embeddable) ?? '' }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={{ backgroundColor: euiTheme.colors.lightestShade }}>
        {layerResults.map((layer, i) => (
          <Layer key={`${layer.layerId}`} layer={layer} layerIndex={i} embeddable={embeddable} />
        ))}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.geoJobFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
