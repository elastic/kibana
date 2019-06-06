/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { mergeMap, takeUntil } from 'rxjs/operators';
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

export const isResizing = () => document.body.className.includes(globalResizeCursorClassName);

export class Resizeable extends React.PureComponent<Props> {
  private drag$: Observable<Event> | null;
  private ref: React.RefObject<HTMLElement>;
  private dragSubscription: Subscription | null;
  private upSubscription: Subscription | null;

  constructor(props: Props) {
    super(props);

    // NOTE: the ref and observable below are NOT stored in component `State`
    this.ref = React.createRef<HTMLElement>();
    this.drag$ = null;
    this.dragSubscription = null;
    this.upSubscription = null;
  }

  public componentDidMount() {
    const { id, onResize } = this.props;

    const move$ = fromEvent(document, 'mousemove');
    const down$ = fromEvent(this.ref.current!, 'mousedown');
    const up$ = fromEvent(document, 'mouseup');

    this.drag$ = down$.pipe(mergeMap(() => move$.pipe(takeUntil(up$))));
    this.dragSubscription = this.drag$.subscribe(e => {
      const delta = (e as MouseEvent).movementX;

      onResize({ id, delta });

      addGlobalResizeCursorStyleToBody();
    });

    this.upSubscription = up$.subscribe(() => {
      if (isResizing()) {
        removeGlobalResizeCursorStyleFromBody();
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
        {render(isResizing())}
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
}
