/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import $ from 'jquery';

export class LayerTOC extends React.Component {

  constructor(props) {
    super(props);
    this._domContainer = null;
  }

  componentDidMount() {
    $(this._domContainer).sortable({
      update: () => {
        //todo update sorting
      }
    });
  }

  _renderLayers() {
    return this.props.layers.map((layer) => {
      return (<div key={layer.getId()}>{layer.renderTOCEntry()}</div>);
    });
  }

  render() {
    const layerEntries = this._renderLayers();
    return (
      <div className="layerTOC" ref={node => this._domContainer = node}>
        {layerEntries}
      </div>
    );
  }
}

