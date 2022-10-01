/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { DropResult, EuiDragDropContext, EuiDroppable, EuiDraggable } from '@elastic/eui';
import { TOCEntry } from './toc_entry';
import { ILayer } from '../../../../classes/layers/layer';

export interface Props {
  isReadOnly: boolean;
  layerList: ILayer[];
  openTOCDetails: string[];
  createLayerGroup: (draggedLayerId: string, combineWithLayerId: string) => void;
  updateLayerOrder: (newOrder: number[]) => void;
}

export class LayerTOC extends Component<Props> {
  componentWillUnmount() {
    this._updateDebounced.cancel();
  }

  shouldComponentUpdate() {
    this._updateDebounced();
    return false;
  }

  _updateDebounced = _.debounce(this.forceUpdate, 100);

  _onDragEnd = ({ combine, destination, source }: DropResult) => {
    // Layer list is displayed in reverse order so index needs to reversed to get back to original reference.
    const reverseIndex = (index: number) => {
      return this.props.layerList.length - index - 1;
    };

    if (combine) {
      this.props.createLayerGroup(
        this.props.layerList[reverseIndex(source.index)].getId(),
        combine.draggableId
      );
      return;
    }

    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

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

  _getDepth(layer: ILayer, depth: number): { depth: number; showInTOC: boolean } {
    if (layer.getParent() === undefined) {
      return { depth, showInTOC: true };
    }

    const parent = this.props.layerList.find((nextLayer) => {
      return layer.getParent() === nextLayer.getId();
    });
    if (!parent) {
      return { depth, showInTOC: false };
    }

    return this.props.openTOCDetails.includes(parent.getId())
      ? this._getDepth(parent, depth + 1)
      : { depth, showInTOC: false };
  }

  _renderLayers() {
    const tocEntryList = this.props.layerList
      .map((layer) => {
        return {
          ...this._getDepth(layer, 0),
          layer,
        };
      })
      .filter(({ showInTOC }) => {
        return showInTOC;
      })
      // Reverse layer list so first layer drawn on map is at the bottom and
      // last layer drawn on map is at the top.
      .reverse();

    if (this.props.isReadOnly) {
      return tocEntryList.map(({ depth, layer }) => {
        return <TOCEntry key={layer.getId()} depth={depth} layer={layer} />;
      });
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable
          droppableId="mapLayerTOC"
          spacing="none"
          isCombineEnabled={!this.props.isReadOnly}
        >
          {(droppableProvided, snapshot) => {
            const tocEntries = tocEntryList.map(({ depth, layer }, idx: number) => (
              <EuiDraggable
                spacing="none"
                key={layer.getId()}
                index={idx}
                draggableId={layer.getId()}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided, state) => {
                  return (
                    <TOCEntry
                      depth={depth}
                      layer={layer}
                      dragHandleProps={provided.dragHandleProps}
                      isDragging={state.isDragging}
                      isCombining={!!state.combineWith}
                      isDraggingOver={snapshot.isDraggingOver}
                    />
                  );
                }}
              </EuiDraggable>
            ));
            return <div>{tocEntries}</div>;
          }}
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    return <div data-test-subj="mapLayerTOC">{this._renderLayers()}</div>;
  }
}
