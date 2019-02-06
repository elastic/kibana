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
    this._attachSortHandler();
  }

  _attachSortHandler() {
    const tocEntries = this._domContainer;
    let length;
    $(tocEntries).sortable({
      start: (evt, { item }) => {
        length = tocEntries.children.length;
        $(this).attr('data-previndex', length - item.index() - 2);
      },
      update: (evt, { item }) => {
        const prevIndex = +$(this).attr('data-previndex');
        length = tocEntries.children.length;
        const newIndex = length - item.index() - 1;
        const newOrder = Array.from(tocEntries.children)
          .map((el, idx) => idx);
        newOrder.splice(prevIndex, 1);
        newOrder.splice(newIndex, 0, prevIndex);
        this.props.updateLayerOrder(newOrder);
      }
    });
  }

  _renderLayers() {
    return this.props.layerList
      .map((layer) => {
        return (
          <TOCEntry
            key={layer.getId()}
            layer={layer}
          />
        );
      })
      .reverse();
  }

  render() {
    const layerEntries = this._renderLayers();
    return (
      <div ref={node => this._domContainer = node}>
        {layerEntries}
      </div>
    );
  }
}

