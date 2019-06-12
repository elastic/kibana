/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fromQuery, toQuery } from '../../Links/url_helpers';
import { history } from '../../../../utils/history';

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

    const currentSearch = toQuery(history.location.search);
    const nextSearch = {
      rangeFrom: new Date(range.start).toISOString(),
      rangeTo: new Date(range.end).toISOString()
    };

    history.push({
      ...history.location,
      search: fromQuery({
        ...currentSearch,
        ...nextSearch
      })
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
