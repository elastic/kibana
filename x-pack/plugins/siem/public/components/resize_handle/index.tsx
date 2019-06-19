/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';
import styled, { injectGlobal } from 'styled-components';

export type OnResize = (
  {
    delta,
    id,
  }: {
    delta: number;
    id: string;
  }
) => void;

export const resizeCursorStyle = 'col-resize';
export const globalResizeCursorClassName = 'global-resize-cursor';

/** This polyfill is for Safari only. `movementX` is more accurate and "feels" better, so only use this function on Safari */
export const calculateDeltaX = ({ prevX, screenX }: { prevX: number; screenX: number }) =>
  prevX !== 0 ? screenX - prevX : 0;

const isSafari = /^((?!chrome|android|crios|fxios|Firefox).)*safari/i.test(navigator.userAgent);

// eslint-disable-next-line no-unused-expressions
injectGlobal`
.${globalResizeCursorClassName} {
  * {
      cursor: ${resizeCursorStyle};
      &: hover {
        cursor: ${resizeCursorStyle};
      }
  }
}
`;

interface Props {
  /** the `onResize` callback will be invoked with this id */
  id: string;
  /** The resizeable content to render */
  render: (isResizing: boolean) => React.ReactNode;
  /** a (styled) resize handle */
  handle: React.ReactNode;
  /** optionally provide a height style ResizeHandleContainer */
  height?: string;
  /** invoked when the handle is resized */
  onResize: OnResize;
}

interface State {
  isResizing: boolean;
}

const ResizeHandleContainer = styled.div<{ height?: string }>`
  cursor: ${resizeCursorStyle};
  ${({ height }) => (height != null ? `height: ${height}` : '')}
`;

export const addGlobalResizeCursorStyleToBody = () => {
  document.body.classList.add(globalResizeCursorClassName);
};

export const removeGlobalResizeCursorStyleFromBody = () => {
  document.body.classList.remove(globalResizeCursorClassName);
};

export class Resizeable extends React.PureComponent<Props, State> {
  private drag$: Observable<MouseEvent> | null;
  private dragSubscription: Subscription | null;
  private prevX: number = 0;
  private ref: React.RefObject<HTMLElement>;
  private upSubscription: Subscription | null;

  constructor(props: Props) {
    super(props);

    // NOTE: the ref and observable below are NOT stored in component `State`
    this.ref = React.createRef<HTMLElement>();
    this.drag$ = null;
    this.dragSubscription = null;
    this.upSubscription = null;

    this.state = {
      isResizing: false,
    };
  }

  public componentDidMount() {
    const { id, onResize } = this.props;

    const move$ = fromEvent<MouseEvent>(document, 'mousemove');
    const down$ = fromEvent<MouseEvent>(this.ref.current!, 'mousedown');
    const up$ = fromEvent<MouseEvent>(document, 'mouseup');

    this.drag$ = down$.pipe(concatMap(() => move$.pipe(takeUntil(up$))));
    this.dragSubscription = this.drag$.subscribe(e => {
      const delta = isSafari ? this.calculateDelta(e) : e.movementX;

      if (!this.state.isResizing) {
        this.setState({ isResizing: true });
      }

      onResize({ id, delta });

      addGlobalResizeCursorStyleToBody();
    });

    this.upSubscription = up$.subscribe(() => {
      if (this.state.isResizing) {
        removeGlobalResizeCursorStyleFromBody();

        this.setState({ isResizing: false });
      }
    });
  }

  public componentWillUnmount() {
    if (this.dragSubscription != null) {
      this.dragSubscription.unsubscribe();
    }

    if (this.upSubscription != null) {
      this.upSubscription.unsubscribe();
    }
  }

  public render() {
    const { handle, height, render } = this.props;

    return (
      <>
        {render(this.state.isResizing)}
        <ResizeHandleContainer
          data-test-subj="resize-handle-container"
          height={height}
          innerRef={this.ref}
        >
          {handle}
        </ResizeHandleContainer>
      </>
    );
  }

  private calculateDelta = (e: MouseEvent) => {
    const deltaX = calculateDeltaX({ prevX: this.prevX, screenX: e.screenX });

    this.prevX = e.screenX;

    return deltaX;
  };
}
