/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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

import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';

import { TruncatableText } from '../truncatable_text';
import { WithHoverActions } from '../with_hover_actions';
import { useDraggableKeyboardWrapper } from './draggable_keyboard_wrapper_hook';
import { DraggableWrapperHoverContent, useGetTimelineId } from './draggable_wrapper_hover_content';
import { DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME, getDraggableId, getDroppableId } from './helpers';
import { ProviderContainer } from './provider_container';

import * as i18n from './translations';

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

type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided | null,
  state: DraggableStateSnapshot
) => React.ReactNode;

interface Props {
  dataProvider: DataProvider;
  disabled?: boolean;
  inline?: boolean;
  render: RenderFunctionProp;
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

const draggableContainsLinks = (draggableElement: HTMLDivElement | null) => {
  const links = draggableElement?.querySelectorAll('.euiLink') ?? [];
  return links.length > 0;
};

const DraggableWrapperComponent: React.FC<Props> = ({
  dataProvider,
  onFilterAdded,
  render,
  timelineId,
  truncate,
}) => {
  const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
  const draggableRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState(false);
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const [goGetTimelineId, setGoGetTimelineId] = useState(false);
  const timelineIdFind = useGetTimelineId(draggableRef, goGetTimelineId);
  const [providerRegistered, setProviderRegistered] = useState(false);
  const isDisabled = dataProvider.id.includes(`-${ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID}-`);
  const [hoverActionsOwnFocus, setHoverActionsOwnFocus] = useState<boolean>(false);
  const dispatch = useDispatch();

  const handleClosePopOverTrigger = useCallback(() => {
    setClosePopOverTrigger((prevClosePopOverTrigger) => !prevClosePopOverTrigger);
    setHoverActionsOwnFocus((prevHoverActionsOwnFocus) => {
      if (prevHoverActionsOwnFocus) {
        setTimeout(() => {
          keyboardHandlerRef.current?.focus();
        }, 0);
      }
      return false; // always give up ownership
    });

    setTimeout(() => {
      setHoverActionsOwnFocus(false);
    }, 0); // invoked on the next tick, because we want to restore focus first
  }, [keyboardHandlerRef]);

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

  const hoverContent = useMemo(() => {
    // display links as additional content in the hover menu to enable keyboard
    // navigation of links (when the draggable contains them):
    const additionalContent =
      hoverActionsOwnFocus && !showTopN && draggableContainsLinks(draggableRef.current) ? (
        <ProviderContentWrapper
          data-test-subj={`draggable-link-content-${dataProvider.queryMatch.field}`}
        >
          {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
        </ProviderContentWrapper>
      ) : null;

    return (
      <DraggableWrapperHoverContent
        additionalContent={additionalContent}
        closePopOver={handleClosePopOverTrigger}
        draggableId={getDraggableId(dataProvider.id)}
        field={dataProvider.queryMatch.field}
        goGetTimelineId={setGoGetTimelineId}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showTopN={showTopN}
        timelineId={timelineId ?? timelineIdFind}
        toggleTopN={toggleTopN}
        value={
          typeof dataProvider.queryMatch.value !== 'number'
            ? dataProvider.queryMatch.value
            : `${dataProvider.queryMatch.value}`
        }
      />
    );
  }, [
    dataProvider,
    handleClosePopOverTrigger,
    hoverActionsOwnFocus,
    onFilterAdded,
    render,
    showTopN,
    timelineId,
    timelineIdFind,
    toggleTopN,
  ]);

  const RenderClone = useCallback(
    (provided, snapshot) => (
      <ConditionalPortal registerProvider={registerProvider}>
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getStyle(provided.draggableProps.style, snapshot)}
          ref={provided.innerRef}
          data-test-subj="providerContainer"
          tabIndex={-1}
        >
          <ProviderContentWrapper
            data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
          >
            {render(dataProvider, provided, snapshot)}
          </ProviderContentWrapper>
        </div>
      </ConditionalPortal>
    ),
    [dataProvider, registerProvider, render]
  );

  const DraggableContent = useCallback(
    (provided, snapshot) => (
      <ProviderContainer
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={(e: HTMLDivElement) => {
          provided.innerRef(e);
          draggableRef.current = e;
        }}
        data-test-subj="providerContainer"
        isDragging={snapshot.isDragging}
        registerProvider={registerProvider}
        tabIndex={-1}
      >
        <EuiScreenReaderOnly data-test-subj="screenReaderOnlyField">
          <p>{dataProvider.queryMatch.field}</p>
        </EuiScreenReaderOnly>
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
        {!snapshot.isDragging && (
          <EuiScreenReaderOnly data-test-subj="draggableKeyboardInstructionsNotDragging">
            <p>{i18n.DRAGGABLE_KEYBOARD_INSTRUCTIONS_NOT_DRAGGING_SCREEN_READER_ONLY}</p>
          </EuiScreenReaderOnly>
        )}
      </ProviderContainer>
    ),
    [dataProvider, registerProvider, render, truncate]
  );

  const openPopover = useCallback(() => {
    setHoverActionsOwnFocus(true);
  }, []);

  const { onBlur, onKeyDown } = useDraggableKeyboardWrapper({
    closePopover: handleClosePopOverTrigger,
    draggableId: getDraggableId(dataProvider.id),
    fieldName: dataProvider.queryMatch.field,
    keyboardHandlerRef,
    openPopover,
  });

  const onFocus = useCallback(() => {
    if (!hoverActionsOwnFocus) {
      keyboardHandlerRef.current?.focus();
    }
  }, [hoverActionsOwnFocus, keyboardHandlerRef]);

  const onCloseRequested = useCallback(() => {
    setShowTopN(false);

    if (hoverActionsOwnFocus) {
      setHoverActionsOwnFocus(false);

      setTimeout(() => {
        onFocus(); // return focus to this draggable on the next tick, because we owned focus
      }, 0);
    }
  }, [onFocus, hoverActionsOwnFocus]);

  const DroppableContent = useCallback(
    (droppableProvided) => (
      <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
        <div
          className={DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}
          data-test-subj="draggableWrapperKeyboardHandler"
          onClick={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          ref={keyboardHandlerRef}
          role="button"
          tabIndex={0}
        >
          <Draggable
            draggableId={getDraggableId(dataProvider.id)}
            index={0}
            key={getDraggableId(dataProvider.id)}
            isDragDisabled={isDisabled}
          >
            {DraggableContent}
          </Draggable>
        </div>
        {droppableProvided.placeholder}
      </div>
    ),
    [DraggableContent, dataProvider.id, isDisabled, onBlur, onFocus, onKeyDown]
  );

  const content = useMemo(
    () => (
      <Wrapper data-test-subj="draggableWrapperDiv" disabled={isDisabled}>
        <DragDropErrorBoundary>
          <Droppable
            isDropDisabled={true}
            droppableId={getDroppableId(dataProvider.id)}
            renderClone={RenderClone}
          >
            {DroppableContent}
          </Droppable>
        </DragDropErrorBoundary>
      </Wrapper>
    ),
    [DroppableContent, RenderClone, dataProvider.id, isDisabled]
  );

  const renderContent = useCallback(() => content, [content]);

  if (isDisabled) return <>{content}</>;

  return (
    <WithHoverActions
      alwaysShow={showTopN || hoverActionsOwnFocus}
      closePopOverTrigger={closePopOverTrigger}
      hoverContent={hoverContent}
      onCloseRequested={onCloseRequested}
      render={renderContent}
    />
  );
};

export const DraggableWrapper = React.memo(DraggableWrapperComponent);

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
