/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggingStyle,
  Droppable,
  NotDraggingStyle,
} from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { TruncatableText } from '../truncatable_text';
import { WithHoverActions } from '../with_hover_actions';

import { DraggableWrapperHoverContent } from './draggable_wrapper_hover_content';
import { getDraggableId, getDroppableId } from './helpers';
import { ProviderContainer } from './provider_container';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

/**
 * Wraps the `react-beautiful-dnd` error boundary. See also:
 * https://github.com/atlassian/react-beautiful-dnd/blob/v12.0.0/docs/guides/setup-problem-detection-and-error-recovery.md
 *
 * NOTE: This extends from `PureComponent` because, at the time of this
 * writing, there's no hook equivalent for `componentDidCatch`, per
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
class DragDropErrorBoundary extends React.PureComponent {
  componentDidCatch() {
    this.forceUpdate(); // required for recovery
  }

  render() {
    return this.props.children;
  }
}

const Wrapper = styled.div`
  display: inline-block;
  max-width: 100%;

  [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

Wrapper.displayName = 'Wrapper';

const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }
`;

type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided,
  state: DraggableStateSnapshot
) => React.ReactNode;

interface Props {
  dataProvider: DataProvider;
  inline?: boolean;
  render: RenderFunctionProp;
  truncate?: boolean;
  onFilterAdded?: () => void;
}

/**
 * Wraps a draggable component to handle registration / unregistration of the
 * data provider associated with the item being dropped
 */

export const getStyle = (
  style: DraggingStyle | NotDraggingStyle | undefined,
  snapshot: DraggableStateSnapshot
) => {
  if (!snapshot.isDropAnimating) {
    return style;
  }

  return {
    ...style,
    transitionDuration: '0.00000001s', // cannot be 0, but can be a very short duration
  };
};

export const DraggableWrapper = React.memo<Props>(
  ({ dataProvider, onFilterAdded, render, truncate }) => {
    const [showTopN, setShowTopN] = useState<boolean>(false);
    const toggleTopN = useCallback(() => {
      setShowTopN(!showTopN);
    }, [setShowTopN, showTopN]);

    const [providerRegistered, setProviderRegistered] = useState(false);

    const dispatch = useDispatch();

    const registerProvider = useCallback(() => {
      if (!providerRegistered) {
        dispatch(dragAndDropActions.registerProvider({ provider: dataProvider }));
        setProviderRegistered(true);
      }
    }, [dispatch, providerRegistered, dataProvider]);

    const unRegisterProvider = useCallback(
      () => dispatch(dragAndDropActions.unRegisterProvider({ id: dataProvider.id })),
      [dispatch, dataProvider]
    );

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      []
    );

    const hoverContent = useMemo(
      () => (
        <DraggableWrapperHoverContent
          field={dataProvider.queryMatch.field}
          onFilterAdded={onFilterAdded}
          showTopN={showTopN}
          toggleTopN={toggleTopN}
          value={
            typeof dataProvider.queryMatch.value !== 'number'
              ? dataProvider.queryMatch.value
              : `${dataProvider.queryMatch.value}`
          }
        />
      ),
      [dataProvider, onFilterAdded, showTopN, toggleTopN]
    );

    const renderContent = useCallback(
      () => (
        <Wrapper data-test-subj="draggableWrapperDiv">
          <DragDropErrorBoundary>
            <Droppable
              isDropDisabled={true}
              droppableId={getDroppableId(dataProvider.id)}
              renderClone={(provided, snapshot) => (
                <ConditionalPortal registerProvider={registerProvider}>
                  <div
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getStyle(provided.draggableProps.style, snapshot)}
                    ref={provided.innerRef}
                    data-test-subj="providerContainer"
                  >
                    <ProviderContentWrapper
                      data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
                    >
                      {render(dataProvider, provided, snapshot)}
                    </ProviderContentWrapper>
                  </div>
                </ConditionalPortal>
              )}
            >
              {droppableProvided => (
                <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                  <Draggable
                    draggableId={getDraggableId(dataProvider.id)}
                    index={0}
                    key={getDraggableId(dataProvider.id)}
                  >
                    {(provided, snapshot) => (
                      <ProviderContainer
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        data-test-subj="providerContainer"
                        isDragging={snapshot.isDragging}
                        registerProvider={registerProvider}
                      >
                        {truncate && !snapshot.isDragging ? (
                          <TruncatableText data-test-subj="draggable-truncatable-content">
                            {render(dataProvider, provided, snapshot)}
                          </TruncatableText>
                        ) : (
                          <ProviderContentWrapper
                            data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
                          >
                            {render(dataProvider, provided, snapshot)}
                          </ProviderContentWrapper>
                        )}
                      </ProviderContainer>
                    )}
                  </Draggable>
                  {droppableProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropErrorBoundary>
        </Wrapper>
      ),
      [dataProvider, render, registerProvider, truncate]
    );

    return (
      <WithHoverActions alwaysShow={showTopN} hoverContent={hoverContent} render={renderContent} />
    );
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.dataProvider, nextProps.dataProvider) &&
    prevProps.render !== nextProps.render &&
    prevProps.truncate === nextProps.truncate
);

DraggableWrapper.displayName = 'DraggableWrapper';

/**
 * Conditionally wraps children in an EuiPortal to ensure drag offsets are correct when dragging
 * from containers that have css transforms
 *
 * See: https://github.com/atlassian/react-beautiful-dnd/issues/499
 */

interface ConditionalPortalProps {
  children: React.ReactNode;
  registerProvider: () => void;
}

export const ConditionalPortal = React.memo<ConditionalPortalProps>(
  ({ children, registerProvider }) => {
    useEffect(() => {
      registerProvider();
    }, [registerProvider]);

    return <>{children}</>;
  }
);

ConditionalPortal.displayName = 'ConditionalPortal';
