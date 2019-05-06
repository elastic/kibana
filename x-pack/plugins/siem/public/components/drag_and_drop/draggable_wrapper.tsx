/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { defaultTo, isEqual } from 'lodash/fp';
import * as React from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { State } from '../../store';
// This import needs to be directly link to drag_and_drop store or we will have a circular dependency
import {
  dragAndDropActions,
  dragAndDropModel,
  dragAndDropSelectors,
} from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { TruncatableText } from '../truncatable_text';

import { getDraggableId, getDroppableId } from './helpers';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

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
  width?: string;
}

interface StateReduxProps {
  dataProviders?: dragAndDropModel.IdToDataProvider;
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

/**
 * Wraps a draggable component to handle registration / unregistration of the
 * data provider associated with the item being dropped
 */
class DraggableWrapperComponent extends React.Component<Props> {
  public shouldComponentUpdate = ({ dataProvider, width }: Props) =>
    !isEqual(dataProvider, this.props.dataProvider) || width !== this.props.width;

  public componentDidMount() {
    const { dataProvider, registerProvider } = this.props;

    registerProvider!({ provider: dataProvider });
  }

  public componentWillUnmount() {
    const { dataProvider, unRegisterProvider } = this.props;

    unRegisterProvider!({ id: dataProvider.id });
  }

  public render() {
    const { dataProvider, render, width } = this.props;

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
                    {width != null && !snapshot.isDragging ? (
                      <TruncatableText
                        data-test-subj="draggable-truncatable-content"
                        size="s"
                        width={width}
                      >
                        {render(dataProvider, provided, snapshot)}
                      </TruncatableText>
                    ) : (
                      <EuiText data-test-subj="draggable-content" size="s">
                        {render(dataProvider, provided, snapshot)}
                      </EuiText>
                    )}
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

const emptyDataProviders: dragAndDropModel.IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) =>
  defaultTo(emptyDataProviders, dragAndDropSelectors.dataProvidersSelector(state));

export const DraggableWrapper = connect(
  mapStateToProps,
  {
    registerProvider: dragAndDropActions.registerProvider,
    unRegisterProvider: dragAndDropActions.unRegisterProvider,
  }
)(DraggableWrapperComponent);
