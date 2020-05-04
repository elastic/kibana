/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { EuiResizeObserver } from '@elastic/eui';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode | React.ReactNode[];
  minScale?: number;
}

interface State {
  scale: number;
}

export class AutoScale extends React.Component<Props, State> {
  private child: Element | null = null;
  private parent: Element | null = null;
  private scale: () => void;

  constructor(props: Props) {
    super(props);

    this.scale = _.throttle(() => {
      const scale = computeScale(this.parent, this.child, this.props.minScale);

      // Prevent an infinite render loop
      if (this.state.scale !== scale) {
        this.setState({ scale });
      }
    });

    // An initial scale of 0 means we always redraw
    // at least once, which is sub-optimal, but it
    // prevents an annoying flicker.
    this.state = { scale: 0 };
  }

  setParent = (el: Element | null) => {
    if (el && this.parent !== el) {
      this.parent = el;
      setTimeout(() => this.scale());
    }
  };

  setChild = (el: Element | null) => {
    if (el && this.child !== el) {
      this.child = el;
      setTimeout(() => this.scale());
    }
  };

  render() {
    const { children, minScale, ...rest } = this.props;
    const { scale } = this.state;
    const style = this.props.style || {};

    return (
      <EuiResizeObserver onResize={this.scale}>
        {resizeRef => (
          <div
            {...rest}
            ref={el => {
              this.setParent(el);
              resizeRef(el);
            }}
            style={{
              ...style,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: '100%',
              maxHeight: '100%',
              overflow: 'hidden',
              lineHeight: 1.5,
            }}
          >
            <div
              ref={this.setChild}
              style={{
                transform: `scale(${scale})`,
              }}
            >
              {children}
            </div>
          </div>
        )}
      </EuiResizeObserver>
    );
  }
}

interface ClientDimensionable {
  clientWidth: number;
  clientHeight: number;
}

const MAX_SCALE = 1;
const MIN_SCALE = 0.3;

/**
 * computeScale computes the ratio by which the child needs to shrink in order
 * to fit into the parent. This function is only exported for testing purposes.
 */
export function computeScale(
  parent: ClientDimensionable | null,
  child: ClientDimensionable | null,
  minScale: number = MIN_SCALE
) {
  if (!parent || !child) {
    return 1;
  }

  const scaleX = parent.clientWidth / child.clientWidth;
  const scaleY = parent.clientHeight / child.clientHeight;

  return Math.max(Math.min(MAX_SCALE, Math.min(scaleX, scaleY)), minScale);
}
