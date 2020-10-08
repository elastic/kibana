/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiDragDropContext, EuiDroppable, EuiDraggable } from '@elastic/eui';
import { TOCEntry } from './toc_entry';

export class LayerTOC extends React.Component {
  componentWillUnmount() {
    this._updateDebounced.cancel();
  }

  shouldComponentUpdate() {
    this._updateDebounced();
    return false;
  }

  _updateDebounced = _.debounce(this.forceUpdate, 100);

  _onDragEnd = ({ source, destination }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    // Layer list is displayed in reverse order so index needs to reversed to get back to original reference.
    const reverseIndex = (index) => {
      return this.props.layerList.length - index - 1;
    };

    const prevIndex = reverseIndex(source.index);
    const newIndex = reverseIndex(destination.index);
    const newOrder = [];
    for (let i = 0; i < this.props.layerList.length; i++) {
      newOrder.push(i);
    }
    newOrder.splice(prevIndex, 1);
    newOrder.splice(newIndex, 0, prevIndex);
    this.props.updateLayerOrder(newOrder);
  };

  _renderLayers() {
    // Reverse layer list so first layer drawn on map is at the bottom and
    // last layer drawn on map is at the top.
    const reverseLayerList = [...this.props.layerList].reverse();

    if (this.props.isReadOnly) {
      return reverseLayerList.map((layer) => {
        return <TOCEntry key={layer.getId()} layer={layer} />;
      });
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="mapLayerTOC" spacing="none">
          {(provided, snapshot) =>
            reverseLayerList.map((layer, idx) => (
              <EuiDraggable
                spacing="none"
                key={layer.getId()}
                index={idx}
                draggableId={layer.getId()}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided, state) => (
                  <TOCEntry
                    layer={layer}
                    dragHandleProps={provided.dragHandleProps}
                    isDragging={state.isDragging}
                    isDraggingOver={snapshot.isDraggingOver}
                  />
                )}
              </EuiDraggable>
            ))
          }
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    return <div data-test-subj="mapLayerTOC">{this._renderLayers()}</div>;
  }
}
