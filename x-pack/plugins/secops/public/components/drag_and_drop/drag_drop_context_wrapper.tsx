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

import { DataProvider } from '../../components/timeline/data_providers/data_provider';
import { dragAndDropActions } from '../../store/local/drag_and_drop';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';
import { dataProvidersSelector } from '../../store/local/drag_and_drop/selectors';
import { State } from '../../store/reducer';
import {
  addProviderToTimeline,
  getProviderIdFromDraggable,
  providerWasDroppedOnTimeline,
} from './helpers';

interface Props {
  dataProviders?: IdToDataProvider;
  dispatch?: Dispatch;
}

class DragDropContextWrapperComponent extends React.PureComponent<Props> {
  public render() {
    const { dataProviders, dispatch, children } = this.props;

    const onDragEnd = (result: DropResult, dataProvider: DataProvider) => {
      if (providerWasDroppedOnTimeline(result)) {
        addProviderToTimeline({ dataProviders: dataProviders!, result, dispatch: dispatch! });
      }
    };

    return (
      <DragDropContext
        onDragEnd={result => {
          const id = getProviderIdFromDraggable(result);
          const dataProvider = dataProviders![id];
          if (dataProvider != null) {
            onDragEnd(result, dataProvider);
          } else {
            dispatch!(dragAndDropActions.noProviderFound({ id }));
          }
        }}
      >
        {children}
      </DragDropContext>
    );
  }
}

const emptyDataProviders: IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) => {
  const dataProviders = defaultTo(emptyDataProviders, dataProvidersSelector(state));

  return { dataProviders };
};

export const DragDropContextWrapper = connect(mapStateToProps)(DragDropContextWrapperComponent);
