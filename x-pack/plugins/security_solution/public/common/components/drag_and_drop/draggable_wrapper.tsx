/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { DraggableStateSnapshot, DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd';
import { EuiDraggable, EuiDroppable } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { dragAndDropActions } from '../../store/drag_and_drop';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';

import { TruncatableText } from '../truncatable_text';
import { WithHoverActions } from '../with_hover_actions';
import { DraggableWrapperHoverContent, useGetTimelineId } from './draggable_wrapper_hover_content';
import { getDraggableId, getDroppableId } from './helpers';
import { ProviderContainer } from './provider_container';

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

interface WrapperProps {
  disabled: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  display: inline-block;
  max-width: 100%;

  [data-rbd-placeholder-context-id] {
    display: none !important;
  }

  ${({ disabled }) =>
    disabled &&
    `
    [data-rbd-draggable-id]:hover,
    .euiBadge:hover,
    .euiBadge__text:hover {
      cursor: default;
    }
  `}
`;

Wrapper.displayName = 'Wrapper';

const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }
`;

interface Props {
  children: React.ReactNode;
  dataProvider: DataProvider;
  disabled?: boolean;
  inline?: boolean;
  timelineId?: string;
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

const DraggableWrapperComponent: React.FC<Props> = ({
  children,
  dataProvider,
  onFilterAdded,
  timelineId,
  truncate,
}) => {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState(false);
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const [goGetTimelineId, setGoGetTimelineId] = useState(false);
  const timelineIdFind = useGetTimelineId(draggableRef, goGetTimelineId);
  const [providerRegistered, setProviderRegistered] = useState(false);
  const isDisabled = dataProvider.id.includes(`-${ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID}-`);
  const dispatch = useDispatch();

  const handleClosePopOverTrigger = useCallback(
    () => setClosePopOverTrigger((prevClosePopOverTrigger) => !prevClosePopOverTrigger),
    []
  );

  const toggleTopN = useCallback(() => {
    setShowTopN((prevShowTopN) => {
      const newShowTopN = !prevShowTopN;
      if (newShowTopN === false) {
        handleClosePopOverTrigger();
      }
      return newShowTopN;
    });
  }, [handleClosePopOverTrigger]);

  const registerProvider = useCallback(() => {
    if (!isDisabled) {
      dispatch(dragAndDropActions.registerProvider({ provider: dataProvider }));
      setProviderRegistered(true);
    }
  }, [isDisabled, dispatch, dataProvider]);

  const unRegisterProvider = useCallback(
    () =>
      providerRegistered &&
      dispatch(dragAndDropActions.unRegisterProvider({ id: dataProvider.id })),
    [providerRegistered, dispatch, dataProvider.id]
  );

  useEffect(
    () => () => {
      unRegisterProvider();
    },
    [unRegisterProvider]
  );

  const hoverContent = useMemo(
    () => (
      <DraggableWrapperHoverContent
        closePopOver={handleClosePopOverTrigger}
        draggableId={getDraggableId(dataProvider.id)}
        field={dataProvider.queryMatch.field}
        goGetTimelineId={setGoGetTimelineId}
        onFilterAdded={onFilterAdded}
        showTopN={showTopN}
        timelineId={timelineId ?? timelineIdFind}
        toggleTopN={toggleTopN}
        value={
          typeof dataProvider.queryMatch.value !== 'number'
            ? dataProvider.queryMatch.value
            : `${dataProvider.queryMatch.value}`
        }
      />
    ),
    [
      dataProvider,
      handleClosePopOverTrigger,
      onFilterAdded,
      showTopN,
      timelineId,
      timelineIdFind,
      toggleTopN,
    ]
  );

  const RenderClone = useCallback(
    (provided, snapshot) => (
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
            <Provider dataProvider={dataProvider} />
          </ProviderContentWrapper>
        </div>
      </ConditionalPortal>
    ),
    [dataProvider, registerProvider]
  );

  const DraggableContent = useMemo(
    () => (
      <ProviderContainer
        ref={(e: HTMLDivElement) => {
          draggableRef.current = e;
        }}
        data-test-subj="providerContainer"
        registerProvider={registerProvider}
      >
        {truncate ? (
          <TruncatableText data-test-subj="draggable-truncatable-content">
            {children}
          </TruncatableText>
        ) : (
          <ProviderContentWrapper
            data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
          >
            {children}
          </ProviderContentWrapper>
        )}
      </ProviderContainer>
    ),
    [children, dataProvider, registerProvider, truncate]
  );

  const content = useMemo(
    () => (
      <Wrapper data-test-subj="draggableWrapperDiv" disabled={isDisabled}>
        <DragDropErrorBoundary>
          <EuiDroppable
            isDropDisabled={true}
            droppableId={getDroppableId(dataProvider.id)}
            renderClone={RenderClone}
            cloneDraggables={true}
          >
            <EuiDraggable
              draggableId={getDraggableId(dataProvider.id)}
              index={0}
              key={getDraggableId(dataProvider.id)}
              isDragDisabled={isDisabled}
            >
              {DraggableContent}
            </EuiDraggable>
          </EuiDroppable>
        </DragDropErrorBoundary>
      </Wrapper>
    ),
    [DraggableContent, RenderClone, dataProvider.id, isDisabled]
  );

  const renderContent = useCallback(() => content, [content]);

  if (isDisabled) return <>{content}</>;

  return (
    <WithHoverActions
      alwaysShow={showTopN}
      closePopOverTrigger={closePopOverTrigger}
      hoverContent={hoverContent}
      render={renderContent}
    />
  );
};

export const DraggableWrapper = React.memo(
  DraggableWrapperComponent,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    deepEqual(prevProps.dataProvider, nextProps.dataProvider) &&
    prevProps.onFilterAdded === nextProps.onFilterAdded &&
    prevProps.timelineId === nextProps.timelineId &&
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
