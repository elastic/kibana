/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {} from '@elastic/eui';

export class LayerTOC extends React.Component {

  constructor(props) {
    super(props);
  }

  _renderLayers() {
    return this.props.layers.map((layer, index) => {
      return (<div key={index}>{layer.renderTOCLayerEntry()}</div>);
    });
  }

  render() {
    const layerEntries = this._renderLayers();
    return (
      <div>
        {layerEntries}
      </div>
    );
  }
}

