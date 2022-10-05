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
  setLayerParent: (layerId: string, parent: string | undefined) => void;
  moveLayerToLeftOfTarget: (moveLayerId: string, targetLayerId: string) => void;
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

  _reverseIndex(index: number) {
    return this.props.layerList.length - index - 1;
  }

  _onDragEnd = ({ combine, destination, source }: DropResult) => {
    if (combine) {
      this.props.createLayerGroup(
        this.props.layerList[this._reverseIndex(source.index)].getId(),
        combine.draggableId
      );
      return;
    }

    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    const sourceIndex = this._reverseIndex(source.index);
    const destinationIndex = this._reverseIndex(destination.index);

    const sourceLayerId = this.props.layerList[sourceIndex].getId();
    const newRightSiblingIndex =
      sourceIndex > destinationIndex
        ? // When layer is moved to the right, new right sibling is layer to the right of destination
          destinationIndex - 1
        : // When layer is moved to the left, new right sibling is the destination
          destinationIndex;
    const newRightSiblingParentLayerId =
      newRightSiblingIndex < 0 ? undefined : this.props.layerList[newRightSiblingIndex].getParent();
    this.props.setLayerParent(sourceLayerId, newRightSiblingParentLayerId);
    this.props.moveLayerToLeftOfTarget(
      sourceLayerId,
      this.props.layerList[newRightSiblingIndex].getId()
    );
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
      .map((layer, index) => {
        return {
          ...this._getDepth(layer, 0),
          draggableIndex: this._reverseIndex(index),
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
            const tocEntries = tocEntryList.map(({ draggableIndex, depth, layer }) => (
              <EuiDraggable
                spacing="none"
                key={layer.getId()}
                index={draggableIndex}
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
