/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { pure } from 'recompose';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';
import { dataProvidersSelector } from '../../store/local/drag_and_drop/selectors';
import { State } from '../../store/reducer';
import {
  addProviderToAndProvider,
  addProviderToTimeline,
  providerWasDroppedOnAndProvider,
  providerWasDroppedOnTimeline,
  providerWasDroppedOnTimelineButton,
} from './helpers';

interface Props {
  dataProviders?: IdToDataProvider;
  dispatch: Dispatch;
}

interface OnDragEndHandlerParams {
  result: DropResult;
  dataProviders: IdToDataProvider;
  dispatch: Dispatch;
}

const onDragEndHandler = ({ result, dataProviders, dispatch }: OnDragEndHandlerParams) => {
  if (providerWasDroppedOnTimeline(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  } else if (providerWasDroppedOnTimelineButton(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  } else if (providerWasDroppedOnAndProvider(result)) {
    addProviderToAndProvider({ dataProviders, result, dispatch });
  }
};

const DragDropContextWrapperComponent = pure<Props>(({ dataProviders, dispatch, children }) => (
  <DragDropContext
    onDragEnd={result => {
      onDragEndHandler({
        result,
        dataProviders: dataProviders!,
        dispatch,
      });
    }}
  >
    {children}
  </DragDropContext>
));

const emptyDataProviders: IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) => {
  const dataProviders = defaultTo(emptyDataProviders, dataProvidersSelector(state));

  return { dataProviders };
};

export const DragDropContextWrapper = connect(mapStateToProps)(DragDropContextWrapperComponent);
