/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
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

import { Layer } from './layer';

interface Props {
  embeddable: MapEmbeddable;
  onClose: () => void;
}

// TODO: Cannot find a date field for when there's no date field
// TODO: no supported layers handle - can't find geo field?
export const GeoJobFlyout: FC<Props> = ({ onClose, embeddable }) => {
  const { euiTheme } = useEuiTheme();
  const [layers, setLayers] = useState<any[]>([]);

  useEffect(() => {
    if (embeddable !== undefined) {
      // @ts-ignore
      const currentLayers = (
        embeddable._savedMap?._attributes
          ? // @ts-ignore // TODO: remove
            JSON.parse(embeddable._savedMap._attributes.layerListJSON)
          : // @ts-ignore // TODO: remove
            []
      ).filter(
        ({ sourceDescriptor }) =>
          sourceDescriptor.geoField !== undefined && sourceDescriptor.indexPatternId !== undefined
      );

      setLayers(currentLayers);
    }
  }, [embeddable]);

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
            values={{ title: embeddable.getTitle() }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={{ backgroundColor: euiTheme.colors.lightestShade }}>
        {layers.map((layer, i) => (
          <Layer layer={layer} layerIndex={i} embeddable={embeddable} />
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
