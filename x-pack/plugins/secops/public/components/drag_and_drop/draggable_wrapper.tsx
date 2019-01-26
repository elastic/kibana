/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo } from 'lodash/fp';
import * as React from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled, { keyframes } from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { dragAndDropActions } from '../../store/local/drag_and_drop';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';
import { dataProvidersSelector } from '../../store/local/drag_and_drop/selectors';
import { State } from '../../store/reducer';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { getDraggableId, getDroppableId } from './helpers';

const dropInEffect = keyframes`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
`;

export const DragEffects = styled.div`
  animation: ${dropInEffect} 250ms;
`;

const ProviderContainer = styled.div`
  &:hover {
    transition: background-color 0.7s ease;
    background-color: ${props => props.theme.eui.euiColorLightShade};
  }
`;

interface OwnProps {
  dataProvider: DataProvider;
  render: (
    props: DataProvider,
    provided: DraggableProvided,
    state: DraggableStateSnapshot
  ) => React.ReactNode;
}

interface StateReduxProps {
  dataProviders?: IdToDataProvider;
}

interface DispatchProps {
  registerProvider?: ActionCreator<{
    provider: DataProvider;
  }>;
  unRegisterProvider?: ActionCreator<{
    id: string;
  }>;
}

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
      <div data-test-subj="draggableWrapperDiv">
        <Droppable isDropDisabled={true} droppableId={getDroppableId(dataProvider.id)}>
          {droppableProvided => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              <Draggable
                draggableId={getDraggableId(dataProvider.id)}
                index={0}
                key={dataProvider.id}
              >
                {(provided, snapshot) => (
                  <ProviderContainer
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    innerRef={provided.innerRef}
                    data-test-subj="providerContainer"
                    style={{
                      ...provided.draggableProps.style,
                      zIndex: 9000, // EuiFlyout has a z-index of 8000
                    }}
                  >
                    {render(dataProvider, provided, snapshot)}
                  </ProviderContainer>
                )}
              </Draggable>
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
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
