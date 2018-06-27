/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TOCEntry } from './toc_entry';
import $ from 'jquery';

export class LayerTOC extends React.Component {

  constructor(props) {
    super(props);
    this._domContainer = null;
  }

  componentDidMount() {
    this._attachSortHandler(this.props);
  }

  _attachSortHandler({ updateLayerOrder }) {
    $(this._domContainer).sortable({
      start: (evt, { item }) => {
        $(this).attr('data-previndex', item.index());
      },
      update: (evt, { item }) => {
        const newIndex = item.index();
        const oldIndex = +$(this).attr('data-previndex');
        const newOrder = Array.from(this._domContainer.children).map((el, idx) => idx);
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, oldIndex);
        updateLayerOrder(newOrder);
      }
    });
  }

  _renderLayers() {
    const { layerList } = this.props;
    return layerList.map((layer, i) => {
      return (
        <TOCEntry
          key={i}
          layerId={layer.id}
          visible={true}
          layerName={`Layer #${i}`}
          // onButtonClick={alert('clicked!')}
        />
      );
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

