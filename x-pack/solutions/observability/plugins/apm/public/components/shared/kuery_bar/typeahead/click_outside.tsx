/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, createRef } from 'react';

interface ClickOutsideProps {
  onClickOutside: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export default class ClickOutside extends Component<ClickOutsideProps> {
  private nodeRef = createRef<HTMLDivElement>();

  componentDidMount() {
    document.addEventListener('mousedown', this.onClick);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onClick);
  }

  onClick = (event: MouseEvent) => {
    if (this.nodeRef.current && !this.nodeRef.current.contains(event.target as Node)) {
      this.props.onClickOutside();
    }
  };

  render() {
    const { onClickOutside: _, children, ...restProps } = this.props;
    return (
      <div ref={this.nodeRef} {...restProps}>
        {children}
      </div>
    );
  }
}
