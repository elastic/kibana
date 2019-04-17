/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  selectedNodes: any[];
  selectToplevelNodes: (...nodeIds: string[]) => void;
  insertNodes: (pageId: string) => (selectedNodes: any[]) => void;
  removeNodes: (pageId: string) => (selectedNodeIds: string[]) => void;
  elementLayer: (pageId: string, selectedNode: any, movement: any) => void;
  groupNodes: () => void;
  ungroupNodes: () => void;
}

const id = (node: any): string => node.id;

const keyMap = {
  DELETE: function deleteNodes({ pageId, removeNodes, selectedNodes }: any): any {
    // currently, handle the removal of one node, exploiting multiselect subsequently
    if (selectedNodes.length) {
      removeNodes(pageId)(selectedNodes.map(id));
    }
  },
  COPY: function copyNodes({ selectedNodes }: any): any {
    if (selectedNodes.length) {
      setClipboardData({ selectedNodes });
      notify.success('Copied element to clipboard');
    }
  },
  CUT: function cutNodes({ pageId, removeNodes, selectedNodes }: any): any {
    if (selectedNodes.length) {
      setClipboardData({ selectedNodes });
      removeNodes(pageId)(selectedNodes.map(id));
      notify.success('Cut element to clipboard');
    }
  },
  CLONE: function duplicateNodes({
    insertNodes,
    pageId,
    selectToplevelNodes,
    selectedNodes,
  }: any): any {
    // TODO: This is slightly different from the duplicateNodes function in sidebar/index.js. Should they be doing the same thing?
    // This should also be abstracted.
    const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
    if (clonedNodes) {
      insertNodes(pageId)(clonedNodes);
      selectToplevelNodes(clonedNodes);
    }
  },
  PASTE: function pasteNodes({ insertNodes, pageId, selectToplevelNodes }: any): any {
    const { selectedNodes } = JSON.parse(getClipboardData()) || { selectedNodes: [] };
    const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
    if (clonedNodes) {
      insertNodes(pageId)(clonedNodes); // first clone and persist the new node(s)
      selectToplevelNodes(clonedNodes); // then select the cloned node(s)
    }
  },
  BRING_FORWARD: function bringForward({ elementLayer, pageId, selectedNodes }: any): any {
    // TODO: Same as above. Abstract these out. This is the same code as in sidebar/index.js
    // Note: these layer actions only work when a single node is selected
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0], 1);
    }
  },
  BRING_TO_FRONT: function bringToFront({ elementLayer, pageId, selectedNodes }: any): any {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0], Infinity);
    }
  },
  SEND_BACKWARD: function sendBackward({ elementLayer, pageId, selectedNodes }: any): any {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0], -1);
    }
  },
  SEND_TO_BACK: function sendToBack({ elementLayer, pageId, selectedNodes }: any): any {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0], -Infinity);
    }
  },
  GROUP: ({ groupNodes }: any): any => groupNodes(),
  UNGROUP: ({ ungroupNodes }: any): any => ungroupNodes(),
} as any;

export class WorkpadShortcuts extends Component<Props> {
  public render() {
    return (
      <Shortcuts
        name="ELEMENT"
        handler={(action: string, event: Event) => {
          event.preventDefault();
          keyMap[action](this.props);
        }}
        targetNodeSelector={`#${this.props.pageId}`}
        global
      />
    );
  }

  public shouldComponentUpdate(nextProps: Props) {
    return !isEqual(nextProps, this.props);
  }
}
