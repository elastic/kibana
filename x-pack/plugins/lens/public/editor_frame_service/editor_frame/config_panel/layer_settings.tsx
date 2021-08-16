/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { NativeRenderer } from '../../../native_renderer';
import { Visualization, VisualizationLayerWidgetProps } from '../../../types';

export function LayerSettings({
  layerId,
  activeVisualization,
  layerConfigProps,
}: {
  layerId: string;
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerWidgetProps;
}) {
  const description = activeVisualization.getDescription(layerConfigProps.state);

  if (!activeVisualization.renderLayerHeader) {
    if (!description) {
      return null;
    }
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        className={'lnsLayerPanel__settingsStaticHeader'}
      >
        {description.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={description.icon} />{' '}
          </EuiFlexItem>
        )}
        <EuiFlexItem grow>
          <EuiTitle size="xxs">
            <h5>{description.label}</h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <NativeRenderer render={activeVisualization.renderLayerHeader} nativeProps={layerConfigProps} />
  );
}
