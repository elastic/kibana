/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { dragAndDropModel, dragAndDropSelectors, State } from '../../store';

import {
  addProviderToTimeline,
  providerWasDroppedOnTimeline,
  providerWasDroppedOnTimelineButton,
} from './helpers';

interface Props {
  dataProviders?: dragAndDropModel.IdToDataProvider;
  dispatch: Dispatch;
}

interface OnDragEndHandlerParams {
  result: DropResult;
  dataProviders: dragAndDropModel.IdToDataProvider;
  dispatch: Dispatch;
}

const onDragEndHandler = ({ result, dataProviders, dispatch }: OnDragEndHandlerParams) => {
  if (providerWasDroppedOnTimeline(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  } else if (providerWasDroppedOnTimelineButton(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  }
};

/**
 * DragDropContextWrapperComponent handles all drag end events
 */
export class DragDropContextWrapperComponent extends React.Component<Props> {
  public shouldComponentUpdate = ({ dataProviders }: Props) =>
    dataProviders !== this.props.dataProviders ? false : true; // prevent re-renders when data providers are added or removed

  public render() {
    const { children } = this.props;

    return (
      <DragDropContext onDragEnd={this.onDragEnd} onDragStart={disableScrolling}>
        {children}
      </DragDropContext>
    );
  }

  private onDragEnd: (result: DropResult, provided: ResponderProvided) => void = (
    result: DropResult
  ) => {
    const { dataProviders, dispatch } = this.props;

    enableScrolling();

    if (dataProviders != null) {
      onDragEndHandler({
        result,
        dataProviders,
        dispatch,
      });
    }
  };
}

const emptyDataProviders: dragAndDropModel.IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) => {
  const dataProviders = defaultTo(
    emptyDataProviders,
    dragAndDropSelectors.dataProvidersSelector(state)
  );

  return { dataProviders };
};

export const DragDropContextWrapper = connect(mapStateToProps)(DragDropContextWrapperComponent);

const disableScrolling = () => {
  const x =
    window.pageXOffset !== undefined
      ? window.pageXOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  const y =
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollTop;

  window.onscroll = () => window.scrollTo(x, y);
};

const enableScrolling = () => (window.onscroll = () => noop);
