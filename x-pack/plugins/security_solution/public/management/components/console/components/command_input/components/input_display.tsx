/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler, ReactNode } from 'react';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const InputDisplayContainer = styled.div`
  overflow: hidden !important;

  .inputDisplay {
    & > * {
      flex-direction: row;
      align-items: center;
    }
  }

  // Styles for when the console's input has focus are defined in '<CommandInput>' component
  .cursor {
    display: inline-block;
    width: 1px;
    height: ${({ theme: { eui } }) => eui.euiLineHeight}em;
    background-color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  }
`;

export interface InputDisplayProps {
  leftOfCursor: ReactNode;
  rightOfCursor: ReactNode;
}

export const InputDisplay = memo<InputDisplayProps>(({ leftOfCursor, rightOfCursor }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const dispatch = useConsoleStateDispatch();
  const { leftOfCursorText, fullTextEntered } = useWithInputTextEntered();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  const currentCursorPosition = leftOfCursorText.length;

  const handleSingleClick: MouseEventHandler<HTMLDivElement> = useCallback(
    (ev) => {
      const clickedTarget = ev.target as HTMLElement;

      // Handle moving the cursor to the click position
      if (
        fullTextEntered.length &&
        clickedTarget.classList &&
        clickedTarget.classList.contains('chr')
      ) {
        const allInputChars = Array.from(ev.currentTarget.querySelectorAll('span.chr'));
        const newCursorPosition = allInputChars.indexOf(clickedTarget);
        const newLeftOfCursorText = fullTextEntered.substring(0, newCursorPosition + 1);
        const newRightOfCursorText = fullTextEntered.substring(newCursorPosition + 1);

        // reset input
        dispatch({
          type: 'updateInputTextEnteredState',
          payload: {
            leftOfCursorText: newLeftOfCursorText,
            rightOfCursorText: newRightOfCursorText,
          },
        });
      }
    },
    [dispatch, fullTextEntered]
  );

  // TODO:PT support double clicking the input text area - highlight the entire content

  useEffect(() => {
    if (containerRef.current && cursorRef.current) {
      const scrollPadding = 20;
      const handleIntersection: IntersectionObserverCallback = (entries) => {
        if (containerRef.current) {
          const intersection = entries[0];

          if (intersection && intersection.rootBounds) {
            const currentScrollLeftValue = containerRef.current.scrollLeft;
            const viewportRightEdge = intersection.rootBounds.right;
            const viewportLeftEdge = intersection.rootBounds.left;
            const cursorPosition = intersection.boundingClientRect.right;

            if (cursorPosition > viewportRightEdge - scrollPadding) {
              // cursor is close to the Right Edge of the display input area.
              // scroll right so that cursor remains visible.
              const newScrollLeftValue =
                currentScrollLeftValue +
                (cursorPosition - intersection.rootBounds.width) +
                scrollPadding;

              containerRef.current.scrollLeft = newScrollLeftValue;
            } else if (cursorPosition < viewportLeftEdge + scrollPadding) {
              // cursor is close to the Left edge of the display input area.
              // scroll left so that cursor remains visible;
              const newScrollLeftValue =
                cursorPosition - scrollPadding < 0 ? 0 : currentScrollLeftValue - scrollPadding;

              containerRef.current.scrollLeft = newScrollLeftValue;
            }
          }
        }
      };

      const observer = new IntersectionObserver(handleIntersection, {
        root: containerRef.current,
        // The `-10px` ensure that the observer is triggered when the cursor is within
        // 10px of the edge of the viewport (the scrolling container).
        rootMargin: '0px -10px',
        threshold: 0,
      });

      observer.observe(cursorRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [currentCursorPosition]);

  return (
    <InputDisplayContainer ref={containerRef}>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        gutterSize="none"
        className="inputDisplay"
        onClick={handleSingleClick}
      >
        <EuiFlexItem
          grow={false}
          data-test-subj={getTestId('cmdInput-leftOfCursor')}
          className="noMinWidth"
        >
          {leftOfCursor}
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="noMinWidth">
          <span className="cursor essentialAnimation" ref={cursorRef} />
        </EuiFlexItem>
        <EuiFlexItem className="noMinWidth" data-test-subj={getTestId('cmdInput-rightOfCursor')}>
          {rightOfCursor}
        </EuiFlexItem>
      </EuiFlexGroup>
    </InputDisplayContainer>
  );
});
InputDisplay.displayName = 'InputDisplay';
