/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle
} from '@elastic/eui';

export class LayerControl extends React.Component {

  constructor(props) {
    super(props);
  }

  setKbnMap(kbnMap) {
    this._kbnMap = kbnMap;
    this._kbnMap.on('layer:added', () => {
    });
  }

  render() {
    return (
      <div>
        <EuiPanel className="LayerControl" hasShadow paddingSize="none">

          <EuiFlexGroup className="LayerControl--header" justifyContent="spaceBetween" responsive={false} gutterSize="none">
            <EuiFlexItem>
              <EuiTitle><h2>Layers</h2></EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }
}

