/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { PieChartTypes } from '../../../common';
import { PieVisualizationState } from '../..';
import { VisualizationLayerSettingsProps } from '../../types';

export function LayerSettings(props: VisualizationLayerSettingsProps<PieVisualizationState>) {
  if (props.state.shape === PieChartTypes.MOSAIC) {
    return null;
  }

  const currentLayer = props.state.layers.find((layer) => layer.layerId === props.layerId);

  if (!currentLayer) {
    return null;
  }

  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.lens.pieChart.multipleMetrics', {
            defaultMessage: 'Multiple metrics',
          })}
          compressed={true}
          checked={Boolean(currentLayer.allowMultipleMetrics)}
          onChange={() => {
            props.setState({
              ...props.state,
              layers: props.state.layers.map((layer) =>
                layer.layerId !== props.layerId
                  ? layer
                  : {
                      ...layer,
                      allowMultipleMetrics: !layer.allowMultipleMetrics,
                    }
              ),
            });
          }}
        />
      </EuiFormRow>
    </>
  );
}
