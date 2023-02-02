/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const lastCursorPosition = useRef<number>(0);
  const observableNeedsUpdate = useRef(true);

  const { leftOfCursorText } = useWithInputTextEntered();
  const currentCursorPosition = leftOfCursorText.length;

  // When the HOME | END keys are used, or long text is pasted, the cursor will "jump"
  // to a location that is beyond the viewport which causes the Observable not to trigger.
  // In order to force the Observable to trigger we need to create it - that is what this
  // `useMemo()` + the `recreateObservable` variable below are doing.
  useMemo(() => {
    const diff = Math.abs(lastCursorPosition.current - currentCursorPosition);
    lastCursorPosition.current = currentCursorPosition;
    if (diff > 1) {
      observableNeedsUpdate.current = true;
    }
  }, [currentCursorPosition]);

  const recreateObservable = observableNeedsUpdate.current;

  // TODO:PT support user clicking anywhere in the input area and moving the cursor to that position

  // TODO:PT support double clicking the input text area - highlight the entire content

  useEffect(() => {
    // The weird assignment here is only used to ensure that `recreateObservable` remains
    // a dependency of this `useEffect()`.
    observableNeedsUpdate.current = recreateObservable ? false : false;

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
              containerRef.current.scrollLeft =
                currentScrollLeftValue +
                (cursorPosition - intersection.rootBounds.width) +
                scrollPadding;
            } else if (cursorPosition < viewportLeftEdge + scrollPadding) {
              // cursor is close to the Left edge of the display input area.
              // scroll left so that cursor remains visible;
              containerRef.current.scrollLeft = currentScrollLeftValue - scrollPadding;
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
  }, [recreateObservable]);

  return (
    <InputDisplayContainer ref={containerRef}>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        gutterSize="none"
        className="inputDisplay"
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
