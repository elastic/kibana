/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, KeyboardEvent } from 'react';

import isEqual from 'react-fast-compare';
// @ts-ignore no @types definition
import { Shortcuts } from 'react-shortcuts';
import { isTextInput } from '../../lib/is_text_input';

export interface Props {
  /**
   * cuts selected elements
   */
  cutNodes: () => void;
  /**
   * copies selected elements to clipboard
   */
  copyNodes: () => void;
  /**
   * pastes elements stored in clipboard to page
   */
  pasteNodes: () => void;
  /**
   * clones selected elements
   */
  cloneNodes: () => void;
  /**
   * deletes selected elements
   */
  deleteNodes: () => void;
  /**
   * moves selected element to top layer
   */
  bringToFront: () => void;
  /**
   * moves selected element up one layer
   */
  bringForward: () => void;
  /**
   * moves selected element down one layer
   */
  sendBackward: () => void;
  /**
   * moves selected element to bottom layer
   */
  sendToBack: () => void;
  /**
   * groups selected elements
   */
  groupNodes: () => void;
  /**
   * ungroups selected group
   */
  ungroupNodes: () => void;
}

export class WorkpadShortcuts extends Component<Props> {
  private _keyMap: { [key: string]: () => void } = {
    CUT: this.props.cutNodes,
    COPY: this.props.copyNodes,
    PASTE: this.props.pasteNodes,
    CLONE: this.props.cloneNodes,
    DELETE: this.props.deleteNodes,
    BRING_TO_FRONT: this.props.bringToFront,
    BRING_FORWARD: this.props.bringForward,
    SEND_BACKWARD: this.props.sendBackward,
    SEND_TO_BACK: this.props.sendToBack,
    GROUP: this.props.groupNodes,
    UNGROUP: this.props.ungroupNodes,
  };

  public render() {
    return (
      <Shortcuts
        name="ELEMENT"
        handler={(action: string, event: KeyboardEvent) => {
          if (!isTextInput(event.target as HTMLInputElement)) {
            event.preventDefault();
            this._keyMap[action]();
          }
        }}
        targetNodeSelector={`body`}
        global
      />
    );
  }

  public shouldComponentUpdate(nextProps: Props) {
    return !isEqual(nextProps, this.props);
  }
}
