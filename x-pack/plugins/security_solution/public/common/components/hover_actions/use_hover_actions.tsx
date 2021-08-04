/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { HoverActions } from '.';

import { DataProvider } from '../../../../common/types';
import { ProviderContentWrapper } from '../drag_and_drop/draggable_wrapper';
import { getDraggableId } from '../drag_and_drop/helpers';
import { useGetTimelineId } from '../drag_and_drop/use_get_timeline_id_from_dom';

const draggableContainsLinks = (draggableElement: HTMLDivElement | null) => {
  const links = draggableElement?.querySelectorAll('.euiLink') ?? [];
  return links.length > 0;
};

type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided | null,
  state: DraggableStateSnapshot
) => React.ReactNode;

interface Props {
  dataProvider: DataProvider;
  disabled?: boolean;
  isDraggable?: boolean;
  inline?: boolean;
  render: RenderFunctionProp;
  timelineId?: string;
  truncate?: boolean;
  onFilterAdded?: () => void;
}

export const useHoverActions = ({
  dataProvider,
  isDraggable,
  onFilterAdded,
  render,
  timelineId,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState(false);
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const [hoverActionsOwnFocus, setHoverActionsOwnFocus] = useState<boolean>(false);
  const [goGetTimelineId, setGoGetTimelineId] = useState(false);
  const timelineIdFind = useGetTimelineId(containerRef, goGetTimelineId);

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

  const hoverContent = useMemo(() => {
    // display links as additional content in the hover menu to enable keyboard
    // navigation of links (when the draggable contains them):
    const additionalContent =
      hoverActionsOwnFocus && !showTopN && draggableContainsLinks(containerRef.current) ? (
        <ProviderContentWrapper
          data-test-subj={`draggable-link-content-${dataProvider.queryMatch.field}`}
        >
          {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
        </ProviderContentWrapper>
      ) : null;

    return (
      <HoverActions
        additionalContent={additionalContent}
        closePopOver={handleClosePopOverTrigger}
        dataProvider={dataProvider}
        draggableId={isDraggable ? getDraggableId(dataProvider.id) : undefined}
        field={dataProvider.queryMatch.field}
        isObjectArray={false}
        goGetTimelineId={setGoGetTimelineId}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showOwnFocus={false}
        showTopN={showTopN}
        timelineId={timelineId ?? timelineIdFind}
        toggleTopN={toggleTopN}
        values={
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
    isDraggable,
    onFilterAdded,
    render,
    showTopN,
    timelineId,
    timelineIdFind,
    toggleTopN,
  ]);

  const setContainerRef = useCallback((e: HTMLDivElement) => {
    containerRef.current = e;
  }, []);

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

  const openPopover = useCallback(() => {
    setHoverActionsOwnFocus(true);
  }, []);

  return useMemo(
    () => ({
      closePopOverTrigger,
      handleClosePopOverTrigger,
      hoverActionsOwnFocus,
      hoverContent,
      keyboardHandlerRef,
      onCloseRequested,
      onFocus,
      openPopover,
      setContainerRef,
      showTopN,
    }),
    [
      closePopOverTrigger,
      handleClosePopOverTrigger,
      hoverActionsOwnFocus,
      hoverContent,
      onCloseRequested,
      onFocus,
      openPopover,
      setContainerRef,
      showTopN,
    ]
  );
};
