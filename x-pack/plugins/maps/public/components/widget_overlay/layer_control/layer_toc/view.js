/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
} from '@elastic/eui';
import { TOCEntry } from './toc_entry';

export class LayerTOC extends React.Component {

  _onDragEnd = ({ source, destination }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    const prevIndex = source.index;
    // Layer list is displayed in reverse order so destination needs to reverses to get back to original reference.
    const newIndex = this.props.layerList.length - destination.index - 1;
    const newOrder = [];
    for(let i = 0; i < this.props.layerList.length; i++) {
      newOrder.push(i);
    }
    newOrder.splice(prevIndex, 1);
    newOrder.splice(newIndex, 0, prevIndex);
    this.props.updateLayerOrder(newOrder);
  };

  _renderLayers() {
    if (this.props.isReadOnly) {
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

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="layerTOC" spacing="none">
          {this.props.layerList.map((layer, idx) => (
            <EuiDraggable spacing="none" key={layer.getId()} index={idx} draggableId={layer.getId()} customDragHandle={true}>
              {(provided) => (
                <TOCEntry
                  layer={layer}
                  dragHandleProps={provided.dragHandleProps}
                />
              )}
            </EuiDraggable>
          )).reverse()}
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    return (
      <div data-test-subj="mapLayerTOC">
        {this._renderLayers()}
      </div>
    );
  }
}

