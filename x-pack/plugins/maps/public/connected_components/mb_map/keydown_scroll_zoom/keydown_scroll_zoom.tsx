/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

interface Props {
  mbMap: MbMap;
}

interface State {
  show: boolean
}

export class KeydownScrollZoom extends Component<Props, State> {
  private _isMounted = false;
  private _hideTimeout: ReturnType<typeof setTimeout> | undefined;

  state: State = {
    show: false,
  }

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('wheel', this._onWheel);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('wheel', this._onWheel);
  }

  _onWheel = (event) => {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = undefined;
    }

    if (event.originalEvent.shiftKey) {
      this.setState({ show: false });
      return;
    }

    this.setState({ show: true });
    this._hideTimeout  = setTimeout(() => {
      if (this._isMounted) {
        this.setState({ show: false });
      }
    }, 200);
    event.preventDefault();
  }

  render() {
    return this.state.show
      ? <div class="mapKeydownScrollZoom">test</div>
      : null;
  }
}

  
  