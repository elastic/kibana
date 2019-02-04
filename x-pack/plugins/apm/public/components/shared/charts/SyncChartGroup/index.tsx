/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { timefilter } from 'ui/timefilter';

export interface RangeSelection {
  start: number;
  end: number;
}

type HoverX = number;
type OnHoverHandler = (hoverX: HoverX) => void;
type OnMouseLeaveHandler = () => void;
type OnSelectionEndHandler = (range: RangeSelection) => void;

export interface HoverXHandlers {
  onHover: OnHoverHandler;
  onMouseLeave: OnMouseLeaveHandler;
  onSelectionEnd: OnSelectionEndHandler;
  hoverX: HoverX | null;
}

interface SyncChartGroupProps {
  render: (props: HoverXHandlers) => React.ReactNode;
}

interface SyncChartState {
  hoverX: HoverX | null;
}

export class SyncChartGroup extends React.Component<
  SyncChartGroupProps,
  SyncChartState
> {
  public state = { hoverX: null };

  public onHover: OnHoverHandler = hoverX => this.setState({ hoverX });
  public onMouseLeave: OnMouseLeaveHandler = () =>
    this.setState({ hoverX: null });
  public onSelectionEnd: OnSelectionEndHandler = range => {
    this.setState({ hoverX: null });
    timefilter.setTime({
      from: moment(range.start).toISOString(),
      to: moment(range.end).toISOString(),
      mode: 'absolute'
    });
  };
  public render() {
    return this.props.render({
      onHover: this.onHover,
      onMouseLeave: this.onMouseLeave,
      onSelectionEnd: this.onSelectionEnd,
      hoverX: this.state.hoverX
    });
  }
}
