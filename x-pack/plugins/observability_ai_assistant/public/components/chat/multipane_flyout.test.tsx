/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MultiPaneFlyout } from './multipane_flyout';

describe('MultiPaneFlyout', () => {
  function renderFlyout(
    secondSlotContentVisibility: boolean,
    setSecondSlotContainer: (element: HTMLDivElement | null) => void
  ) {
    render(
      <MultiPaneFlyout
        mainContent={<>Obs ai assistant rocks</>}
        secondSlotContentVisibility={secondSlotContentVisibility}
        onClose={jest.fn}
        setSecondSlotContainer={setSecondSlotContainer}
      />
    );
  }

  it('should set the styles correctly when visibility is set to false', () => {
    renderFlyout(false, jest.fn());

    // height should be zero
    expect(screen.getByTestId('observabilityAiAssistantFlyoutSecondSlot')).toHaveStyle(
      `block-size: 0`
    );

    expect(screen.getByTestId('observabilityAiAssistantFlyoutMainContentWrapper')).toHaveStyle(
      `flex-basis: 100%`
    );

    expect(screen.getByTestId('observabilityAiAssistantFlyoutSecondSlotWrapper')).toHaveStyle(
      `flex-basis: 0%`
    );
  });

  it('should set the styles correctly when visibility is set to true', () => {
    renderFlyout(true, jest.fn());

    // height should be 100%
    expect(screen.getByTestId('observabilityAiAssistantFlyoutSecondSlot')).toHaveStyle(
      `block-size: 100%`
    );

    expect(screen.getByTestId('observabilityAiAssistantFlyoutMainContentWrapper')).toHaveStyle(
      `flex-basis: 70%`
    );

    expect(screen.getByTestId('observabilityAiAssistantFlyoutSecondSlotWrapper')).toHaveStyle(
      `flex-basis: 30%`
    );
  });

  it('should call the setSecondSlotContainer function', () => {
    const setContainerSpy = jest.fn();
    renderFlyout(true, setContainerSpy);
    expect(setContainerSpy).toHaveBeenCalled();
  });
});
