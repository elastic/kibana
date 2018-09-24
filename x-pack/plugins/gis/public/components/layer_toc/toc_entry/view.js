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
} from '@elastic/eui';
import { VisibilityToggle } from './visiblity_toggle';

export function TOCEntry(props) {
  const visibilityIndicator = props.layer.isLayerLoading()
    ? (<EuiLoadingSpinner size="s"/>)
    : (<VisibilityToggle
      checked={props.layer.isVisible()}
      onChange={() => props.toggleVisible(props.layer.getId())}
    />);
  return (
    <div
      className={`layerEntry`}
      id={props.layer.getId()}
      data-layerid={props.layer.getId()}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} className={props.layer.isVisible() ? 'visible' : 'notvisible'}>
        <EuiFlexItem grow={false} className="layerEntry--visibility">
          {visibilityIndicator}
        </EuiFlexItem>
        <EuiFlexItem className="layerEntry--name">
          <button onClick={() => props.onButtonClick(props.layer.getId())}>
            {props.layer.getDisplayName()}
          </button>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span className="grab"><EuiIcon type="grab" className="grab"/></span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
