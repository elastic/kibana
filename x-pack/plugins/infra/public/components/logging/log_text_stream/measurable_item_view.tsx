/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface MeasureableProps {
  children: (measureRef: React.Ref<HTMLElement>) => React.ReactNode;
  register: (key: any, element: MeasurableItemView | null) => void;
  registrationKey: any;
}

export class MeasurableItemView extends React.PureComponent<MeasureableProps, {}> {
  public childRef = React.createRef<HTMLElement>();

  public getOffsetRect = (): Rect | null => {
    const currentElement = this.childRef.current;

    if (currentElement === null) {
      return null;
    }

    return {
      height: currentElement.offsetHeight,
      left: currentElement.offsetLeft,
      top: currentElement.offsetTop,
      width: currentElement.offsetWidth,
    };
  };

  public componentDidMount() {
    this.props.register(this.props.registrationKey, this);
  }

  public componentWillUnmount() {
    this.props.register(this.props.registrationKey, null);
  }

  public componentDidUpdate(prevProps: MeasureableProps) {
    if (prevProps.registrationKey !== this.props.registrationKey) {
      this.props.register(prevProps.registrationKey, null);
      this.props.register(this.props.registrationKey, this);
    }
  }

  public render() {
    return this.props.children(this.childRef);
  }
}
