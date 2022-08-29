/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, CSSProperties, RefObject } from 'react';

interface Props {
  setWidth: (width: number) => void;
  style: CSSProperties;
  value: string | number;
  x: number;
  y: number;
}

export class RightAlignedText extends Component<Props> {
  private _textRef: RefObject<SVGTextElement> = React.createRef<SVGTextElement>();

  componentDidMount() {
    this._setWidth();
  }

  componentDidUpdate() {
    this._setWidth();
  }

  _setWidth() {
    if (this._textRef.current) {
      this.props.setWidth(this._textRef.current.getBBox().width);
    }
  }

  render() {
    return (
      <text
        ref={this._textRef}
        style={this.props.style}
        textAnchor="end"
        x={this.props.x}
        y={this.props.y}
      >
        {this.props.value}
      </text>
    );
  }
}
