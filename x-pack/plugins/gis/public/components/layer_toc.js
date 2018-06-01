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
        this._syncLayerOrderFromUIToMap();
      }
    });
  }

  _syncLayerOrderFromUIToMap() {

    const domnodes = [...this._domContainer.children];
    const layers = domnodes.map((node) => {
      const layerId = node.getAttribute("data-layerid");
      return this.props.layers.find(layer => {
        return layer.getId() === layerId;
      });
    });
    layers.reverse();
    this.props.layerOrderChange(layers);
  }

  _renderLayers() {
    const topToBottomOrder = this.props.layers.slice();
    topToBottomOrder.reverse();
    return topToBottomOrder.map((layer) => {
      return (<div key={layer.getId()} data-layerid={layer.getId()}>{layer.renderTOCEntry()}</div>);
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

