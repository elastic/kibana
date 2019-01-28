/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { fromEvent, Observable } from 'rxjs';
import { mergeMap, takeUntil } from 'rxjs/operators';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { timelineActions } from '../../store';

interface OwnProps {
  height: number;
  timelineId: string;
}

interface DispatchProps {
  applyDeltaToWidth: ActionCreator<{
    id: string;
    delta: number;
    bodyClientWidthPixels: number;
    maxWidthPercent: number;
    minWidthPixels: number;
  }>;
}

type Props = OwnProps & DispatchProps;

const Handle = styled.div<{ height: number }>`
  border: 2px solid #cccc;
  cursor: col-resize;
  height: ${({ height }) => `${height}px`};
  position: absolute;
  width: 0px;
`;

export class ResizeHandleComponent extends React.PureComponent<Props> {
  private drag$: Observable<Event> | null;
  private ref: React.RefObject<HTMLElement>;

  constructor(props: Props) {
    super(props);

    // NOTE: the ref and observable below are NOT stored in component `State`
    this.ref = React.createRef<HTMLElement>();
    this.drag$ = null;
  }

  public componentDidMount() {
    const { applyDeltaToWidth, timelineId: id } = this.props;

    const move$ = fromEvent(document, 'mousemove');
    const down$ = fromEvent(this.ref.current!, 'mousedown');
    const up$ = fromEvent(document, 'mouseup');

    this.drag$ = down$.pipe(mergeMap(() => move$.pipe(takeUntil(up$))));
    this.drag$.subscribe(e => {
      const delta = (e as MouseEvent).movementX;
      const bodyClientWidthPixels = document.body.clientWidth;

      const minWidthPixels = 310; // do not allow the flyout to shrink below this width (pixels)
      const maxWidthPercent = 95; // do not allow the flyout to grow past this percentage of the view

      applyDeltaToWidth({ id, delta, bodyClientWidthPixels, minWidthPixels, maxWidthPercent });
    });
  }

  public render() {
    return (
      <Handle data-test-subj="flyoutResizeHandle" innerRef={this.ref} height={this.props.height} />
    );
  }
}

const mapStateToProps = () => ({});

export const ResizeHandle = connect(
  mapStateToProps,
  {
    applyDeltaToWidth: timelineActions.applyDeltaToWidth,
  }
)(ResizeHandleComponent);
