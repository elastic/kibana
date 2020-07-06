/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties, PureComponent } from 'react';
// @ts-expect-error untyped local
import { WORKPAD_CONTAINER_ID } from '../../../apps/workpad/workpad_app';

interface State {
  height: string;
  width: string;
  marginLeft: string;
  marginTop: string;
}

// This adds a bit of a buffer to make room for scroll bars, etc.
const BUFFER = 24;

/**
 * The `InteractionBoundary` is a simple area which expands beyond the boundaries
 * of the `InteractiveWorkpadPage` to the corners of the `WorkpadApp`, allowing
 * mouse events started outside to fire and be tracked within.
 */
export class InteractionBoundary extends PureComponent<void, State, void> {
  // Implemented with state, as I think there'll be cases where we want to
  // re-evaluate the size of the interaction boundary in the future.
  constructor() {
    super();
    this.state = {
      height: '0',
      width: '0',
      marginLeft: '0',
      marginTop: '0',
    };
  }

  componentDidMount() {
    const container = $('#' + WORKPAD_CONTAINER_ID);
    const height = container.height();
    const width = container.width();

    if (height && width) {
      this.setState({
        height: height - BUFFER + 'px',
        width: width - BUFFER + 'px',
        marginLeft: -((width - BUFFER) / 2) + 'px',
        marginTop: -((height - BUFFER) / 2) + 'px',
      });
    }
  }

  render() {
    const style: CSSProperties = {
      top: '50%',
      left: '50%',
      position: 'absolute',
      ...this.state,
    };
    return <div id="canvasInteractionBoundary" style={style} />;
  }
}
