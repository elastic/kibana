/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiCheckbox,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';

export function TOCEntry({ layer, openLayerPanel, toggleVisible, zoom }) {

  let visibilityIndicator;
  if (layer.dataHasLoadError()) {
    visibilityIndicator = (
      <EuiIconTip
        aria-label="Load warning"
        size="m"
        type="alert"
        color="warning"
        content={layer.getDataLoadError()}
      />
    );
  } else if (layer.isLayerLoading()) {
    visibilityIndicator = <EuiLoadingSpinner size="s"/>;
  } else if (!layer.showAtZoomLevel(zoom)) {
    const { minZoom, maxZoom } = layer.getZoomConfig();
    visibilityIndicator = (
      <EuiToolTip
        position="left"
        content={`Map is at zoom level ${zoom}.
          This layer is only visible between zoom levels ${minZoom} to ${maxZoom}.`}
      >
        <EuiCheckbox
          id={layer.getId()}
          checked={layer.isVisible()}
          onChange={() => {}}
          disabled
        />
      </EuiToolTip>
    );
  } else {
    visibilityIndicator = (
      <EuiCheckbox
        id={layer.getId()}
        checked={layer.isVisible()}
        onChange={() => toggleVisible(layer.getId())}
      />
    );
  }

  return (
    <div
      className="layerEntry"
      id={layer.getId()}
      data-layerid={layer.getId()}
    >
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        className={layer.isVisible() && layer.showAtZoomLevel(zoom) && !layer.dataHasLoadError() ? 'visible' : 'notvisible'}
      >
        <EuiFlexItem grow={false} className="layerEntry--visibility">
          {visibilityIndicator}
        </EuiFlexItem>
        <EuiFlexItem>
          <button onClick={() => openLayerPanel(layer.getId())} >
            <div style={{ width: 180 }} className="eui-textTruncate">
              {layer.getDisplayName()}
            </div>
          </button>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span className="grab"><EuiIcon type="grab" className="grab"/></span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
