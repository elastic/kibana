/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo } from 'lodash/fp';
import * as React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { dragAndDropActions } from '../../store/local/drag_and_drop';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';
import { dataProvidersSelector } from '../../store/local/drag_and_drop/selectors';
import { State } from '../../store/reducer';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { getDraggableId, getDroppableId } from './helpers';

export interface OwnProps {
  dataProvider: DataProvider;
  render: (props: DataProvider) => React.ReactNode;
}

interface StateReduxProps {
  dataProviders?: IdToDataProvider;
}

interface DispatchProps {
  registerProvider?: ActionCreator<{
    provider: DataProvider;
  }>;
  unRegisterProvider?: ActionCreator<{
    id: DataProviderId;
  }>;
}

// The following empty styled.div are required by react-beautiful-dnd:
const ReactDndDropTarget = styled.div``;
const ProviderContainer = styled.div``;
const DraggableContent = styled.div``;

type Props = OwnProps & StateReduxProps & DispatchProps;

class DraggableWrapperComponent extends React.PureComponent<Props> {
  public componentDidMount() {
    const { dataProvider, registerProvider } = this.props;

    registerProvider!({ provider: dataProvider });
  }

  public componentWillUnmount() {
    const { dataProvider, unRegisterProvider } = this.props;

    unRegisterProvider!({ id: dataProvider.id });
  }

  public render() {
    const { dataProvider, render } = this.props;

    return (
      <DraggableContent data-test-subj="draggableWrapperDiv">
        <Droppable
          droppableId={getDroppableId({ visualizationPlaceholderId: `${dataProvider.id}` })}
        >
          {droppableProvided => (
            <ReactDndDropTarget
              innerRef={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
            >
              <Draggable
                draggableId={getDraggableId({ dataProviderId: dataProvider.id })}
                index={0}
                key={dataProvider.id}
              >
                {provided => (
                  <ProviderContainer
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    innerRef={provided.innerRef}
                    data-test-subj="providerContainer"
                  >
                    {render(dataProvider)}
                  </ProviderContainer>
                )}
              </Draggable>
            </ReactDndDropTarget>
          )}
        </Droppable>
      </DraggableContent>
    );
  }
}

const emptyDataProviders: IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) =>
  defaultTo(emptyDataProviders, dataProvidersSelector(state));

export const DraggableWrapper = connect(
  mapStateToProps,
  {
    registerProvider: dragAndDropActions.registerProvider,
    unRegisterProvider: dragAndDropActions.unRegisterProvider,
  }
)(DraggableWrapperComponent);
