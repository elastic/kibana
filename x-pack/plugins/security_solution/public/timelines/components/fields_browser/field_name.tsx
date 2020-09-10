/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHighlight, EuiText } from '@elastic/eui';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import styled from 'styled-components';

import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../timeline/events';
import { WithHoverActions } from '../../../common/components/with_hover_actions';
import {
  DraggableWrapperHoverContent,
  useGetTimelineId,
} from '../../../common/components/drag_and_drop/draggable_wrapper_hover_content';

/**
 * The name of a (draggable) field
 */
export const FieldNameContainer = styled.span`
  border-radius: 4px;
  padding: 0 4px 0 8px;
  position: relative;

  &::before {
    background-image: linear-gradient(
        135deg,
        ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
        transparent 25%
      ),
      linear-gradient(-135deg, ${({ theme }) => theme.eui.euiColorMediumShade} 25%, transparent 25%),
      linear-gradient(135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%),
      linear-gradient(-135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%);
    background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
    background-size: 2px 2px;
    bottom: 2px;
    content: '';
    display: block;
    left: 2px;
    position: absolute;
    top: 2px;
    width: 4px;
  }

  &:hover,
  &:focus {
    transition: background-color 0.7s ease;
    background-color: #000;
    color: #fff;

    &::before {
      background-image: linear-gradient(135deg, #fff 25%, transparent 25%),
        linear-gradient(
          -135deg,
          ${({ theme }) => theme.eui.euiColorLightestShade} 25%,
          transparent 25%
        ),
        linear-gradient(
          135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        ),
        linear-gradient(
          -135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        );
    }
  }
`;

FieldNameContainer.displayName = 'FieldNameContainer';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  categoryId: string;
  categoryColumns: ColumnHeaderOptions[];
  fieldId: string;
  highlight?: string;
  onUpdateColumns: OnUpdateColumns;
}>(({ fieldId, highlight = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState(false);
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const [goGetTimelineId, setGoGetTimelineId] = useState(false);
  const timelineIdFind = useGetTimelineId(containerRef, goGetTimelineId);

  const toggleTopN = useCallback(() => {
    setShowTopN((prevShowTopN) => !prevShowTopN);
  }, []);

  const handleClosePopOverTrigger = useCallback(
    () => setClosePopOverTrigger((prevClosePopOverTrigger) => !prevClosePopOverTrigger),
    []
  );

  const hoverContent = useMemo(
    () => (
      <DraggableWrapperHoverContent
        closePopOver={handleClosePopOverTrigger}
        field={fieldId}
        showTopN={showTopN}
        toggleTopN={toggleTopN}
        goGetTimelineId={setGoGetTimelineId}
        timelineId={timelineIdFind}
      />
    ),
    [fieldId, handleClosePopOverTrigger, showTopN, timelineIdFind, toggleTopN]
  );

  const render = useCallback(
    () => (
      <EuiText size="xs">
        <FieldNameContainer>
          <EuiHighlight data-test-subj={`field-name-${fieldId}`} search={highlight}>
            {fieldId}
          </EuiHighlight>
        </FieldNameContainer>
      </EuiText>
    ),
    [fieldId, highlight]
  );

  return (
    <div ref={containerRef}>
      <WithHoverActions
        alwaysShow={showTopN}
        closePopOverTrigger={closePopOverTrigger}
        hoverContent={hoverContent}
        render={render}
      />
    </div>
  );
});

FieldName.displayName = 'FieldName';
