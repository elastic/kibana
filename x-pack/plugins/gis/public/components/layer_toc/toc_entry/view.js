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
} from '@elastic/eui';
import { VisibilityToggle } from '../visiblity_toggle';

export function TOCEntry(props) {
  const {
    layerId,
    visible,
    layerName,
    onButtonClick
  } = props;

  return (
    <div
      className={`layerEntry`}
      id={layerId}
      data-layerid={layerId}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} className={visible ? 'visible' : 'notvisible'}>
        <EuiFlexItem grow={false} className="layerEntry--visibility">
          <VisibilityToggle
            checked={visible}
            // onChange={this._onVisibilityChange}
          />
        </EuiFlexItem>
        <EuiFlexItem className="layerEntry--name">
          <button onClick={() => onButtonClick(layerId)}>
            {layerName}
          </button>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span className="grab"><EuiIcon type="grab" className="grab"/></span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
