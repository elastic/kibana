/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import isEqual from 'react-fast-compare';
// @ts-ignore
import { Shortcuts } from 'react-shortcuts';
// @ts-ignore
import { getClipboardData, setClipboardData } from '../../lib/clipboard';
// @ts-ignore
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
// @ts-ignore
import { notify } from '../../lib/notify';

export interface Props {
  pageId: string;
  selectedElementIds: string[];
  selectedElements: any[];
  selectedPrimaryShapes: any[];
  selectElement: (elementId: string) => void;
  insertNodes: (pageId: string) => (selectedElements: any[]) => void;
  removeElements: (pageId: string) => (selectedElementIds: string[]) => void;
  elementLayer: (pageId: string, selectedElement: any, movement: any) => void;
  groupElements: () => void;
  ungroupElements: () => void;
}

export class WorkpadShortcuts extends Component<Props> {
  public render() {
    const { pageId } = this.props;
    return (
      <Shortcuts
        name="ELEMENT"
        handler={(action: string, event: Event) => this._keyHandler(action, event)}
        targetNodeSelector={`#${pageId}`}
        global
      />
    );
  }

  public shouldComponentUpdate(nextProps: Props) {
    return !isEqual(nextProps, this.props);
  }

  private _keyHandler(action: string, event: Event) {
    event.preventDefault();
    switch (action) {
      case 'COPY':
        this._copyElements();
        break;
      case 'CLONE':
        this._duplicateElements();
        break;
      case 'CUT':
        this._cutElements();
        break;
      case 'DELETE':
        this._removeElements();
        break;
      case 'PASTE':
        this._pasteElements();
        break;
      case 'BRING_FORWARD':
        this._bringForward();
        break;
      case 'BRING_TO_FRONT':
        this._bringToFront();
        break;
      case 'SEND_BACKWARD':
        this._sendBackward();
        break;
      case 'SEND_TO_BACK':
        this._sendToBack();
        break;
      case 'GROUP':
        this.props.groupElements();
        break;
      case 'UNGROUP':
        this.props.ungroupElements();
        break;
    }
  }

  private _removeElements() {
    const { pageId, removeElements, selectedElementIds } = this.props;
    // currently, handle the removal of one element, exploiting multiselect subsequently
    if (selectedElementIds.length) {
      removeElements(pageId)(selectedElementIds);
    }
  }

  private _copyElements() {
    const { selectedElements, selectedPrimaryShapes } = this.props;
    if (selectedElements.length) {
      setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
      notify.success('Copied element to clipboard');
    }
  }

  private _cutElements() {
    const {
      pageId,
      removeElements,
      selectedElements,
      selectedElementIds,
      selectedPrimaryShapes,
    } = this.props;

    if (selectedElements.length) {
      setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
      removeElements(pageId)(selectedElementIds);
      notify.success('Copied element to clipboard');
    }
  }

  // TODO: This is slightly different from the duplicateElements function in sidebar/index.js. Should they be doing the same thing?
  // This should also be abstracted.
  private _duplicateElements() {
    const {
      insertNodes,
      pageId,
      selectElement,
      selectedElements,
      selectedPrimaryShapes,
    } = this.props;
    const clonedElements = selectedElements && cloneSubgraphs(selectedElements);

    if (clonedElements) {
      insertNodes(pageId)(clonedElements);
      if (selectedPrimaryShapes.length) {
        if (selectedElements.length > 1) {
          // adHocGroup branch (currently, pasting will leave only the 1st element selected, rather than forming a
          // new adHocGroup - todo)
          selectElement(clonedElements[0].id);
        } else {
          // single element or single persistentGroup branch
          selectElement(
            clonedElements[selectedElements.findIndex(s => s.id === selectedPrimaryShapes[0])].id
          );
        }
      }
    }
  }

  private _pasteElements() {
    const { insertNodes, pageId, selectElement } = this.props;
    const { selectedElements, rootShapes } = JSON.parse(getClipboardData()) || {
      selectedElements: [],
      rootShapes: [],
    };

    const clonedElements = selectedElements && cloneSubgraphs(selectedElements);

    if (clonedElements) {
      // first clone and persist the new node(s)
      insertNodes(pageId)(clonedElements);
      // then select the cloned node
      if (rootShapes.length) {
        if (selectedElements.length > 1) {
          // adHocGroup branch (currently, pasting will leave only the 1st element selected, rather than forming a
          // new adHocGroup - todo)
          selectElement(clonedElements[0].id);
        } else {
          // single element or single persistentGroup branch
          selectElement(
            clonedElements[
              selectedElements.findIndex((s: { id: string }) => s.id === rootShapes[0])
            ].id
          );
        }
      }
    }
  }

  // TODO: Same as above. Abstract these out. This is the same code as in sidebar/index.js
  // Note: these layer actions only work when a single element is selected
  private _bringForward() {
    const { elementLayer, pageId, selectedElements } = this.props;
    if (selectedElements.length === 1) {
      elementLayer(pageId, selectedElements[0], 1);
    }
  }

  private _bringToFront() {
    const { elementLayer, pageId, selectedElements } = this.props;
    if (selectedElements.length === 1) {
      elementLayer(pageId, selectedElements[0], Infinity);
    }
  }

  private _sendBackward() {
    const { elementLayer, pageId, selectedElements } = this.props;
    if (selectedElements.length === 1) {
      elementLayer(pageId, selectedElements[0], -1);
    }
  }

  private _sendToBack() {
    const { elementLayer, pageId, selectedElements } = this.props;
    if (selectedElements.length === 1) {
      elementLayer(pageId, selectedElements[0], -Infinity);
    }
  }
}
