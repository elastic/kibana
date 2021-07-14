/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  DraggableProvided,
  DraggableStateSnapshot,
  DraggingStyle,
  NotDraggingStyle,
} from 'react-beautiful-dnd';
import styled from 'styled-components';

import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

import { useGetTimelineId } from './draggable_wrapper_hover_content';
import { getDraggableId } from './helpers';
import { HoverActions } from '../../hover_actions';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

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
  isObjectArray: boolean;
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

export const ActionCell: React.FC<Props> = React.memo(
  ({ dataProvider, isObjectArray, onFilterAdded, render, timelineId, truncate }) => {
    const draggableRef = useRef<HTMLDivElement | null>(null);
    const [showTopN, setShowTopN] = useState<boolean>(false);
    const [goGetTimelineId, setGoGetTimelineId] = useState(false);
    const timelineIdFind = useGetTimelineId(draggableRef, goGetTimelineId);
    const [hoverActionsOwnFocus] = useState<boolean>(false);

    const toggleTopN = useCallback(() => {
      setShowTopN((prevShowTopN) => {
        const newShowTopN = !prevShowTopN;
        return newShowTopN;
      });
    }, []);

    const additionalContent =
      hoverActionsOwnFocus && !showTopN && draggableContainsLinks(draggableRef.current) ? (
        <ProviderContentWrapper
          data-test-subj={`draggable-link-content-${dataProvider.queryMatch.field}`}
        >
          {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
        </ProviderContentWrapper>
      ) : null;

    return (
      <HoverActions
        additionalContent={additionalContent}
        draggableId={getDraggableId(dataProvider.id)}
        field={dataProvider.queryMatch.field}
        goGetTimelineId={setGoGetTimelineId}
        isObjectArray={isObjectArray}
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
  }
);

ActionCell.displayName = 'ActionCell';
