/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

interface Props {
  children: JSX.Element;
  isDraggingOver?: boolean;
  setIsDraggingOver: (isDraggingOver: boolean) => void;
}
export class DroppableIsDraggingOver extends React.PureComponent<Props> {
  public componentDidMount() {
    this.props.setIsDraggingOver(this.props.isDraggingOver || false);
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.isDraggingOver !== this.props.isDraggingOver) {
      this.props.setIsDraggingOver(this.props.isDraggingOver || false);
    }
  }

  public render() {
    return <>{this.props.children}</>;
  }
}
