/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useExpandedCard } from './use_expanded_card';
import { useStoredExpandedCardId } from '../../../hooks/use_stored_state';
import { useLocation } from 'react-router-dom';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';
import type { OnboardingCardId } from '../../../constants';

// Mock useStoredExpandedCardId
jest.mock('../../../hooks/use_stored_state', () => ({
  useStoredExpandedCardId: jest.fn(),
}));

// Mock useLocation from react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

const mockCardId = 'card-1' as OnboardingCardId;
// Mock window.scrollTo and history.replaceState
window.scrollTo = jest.fn();
const mockReplaceState = jest.fn();
global.history.replaceState = mockReplaceState;

describe('useExpandedCard Hook', () => {
  const mockSetStorageExpandedCardId = jest.fn();
  const spaceId = 'test-space';
  const mockLocation = { hash: '#card-1', pathname: '/test' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStoredExpandedCardId as jest.Mock).mockReturnValue([null, mockSetStorageExpandedCardId]);
    (useLocation as jest.Mock).mockReturnValue(mockLocation);
  });

  it('should set the expanded card id from the hash if the page is fully loaded', async () => {
    const mockReadyState = 'complete';
    const mockGetElementById = jest.fn().mockReturnValue({
      focus: jest.fn(),
      offsetTop: 100,
    });

    Object.defineProperty(document, 'readyState', {
      value: mockReadyState,
      configurable: true,
    });
    document.getElementById = mockGetElementById;

    renderHook(() => useExpandedCard(spaceId));

    // Simulate initial effect that sets expanded card based on URL hash
    expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
    // Ensure that scroll and focus were triggered
    setTimeout(() => {
      expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' });
    }, HEIGHT_ANIMATION_DURATION);
  });

  it('should not scroll if the page is not fully loaded', () => {
    const mockReadyState = 'loading';
    Object.defineProperty(document, 'readyState', {
      value: mockReadyState,
      configurable: true,
    });

    renderHook(() => useExpandedCard(spaceId));

    // If page is not fully loaded, we should not perform any scroll actions
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('should set the expanded card id in storage and URL when setExpandedCardId is called', () => {
    const { result } = renderHook(() => useExpandedCard(spaceId));

    // Call setExpandedCardId
    act(() => {
      result.current.setExpandedCardId(mockCardId, { scroll: false });
    });

    // Check that local storage and URL hash are updated
    expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#${mockCardId}`);
    expect(window.scrollTo).not.toHaveBeenCalled(); // Scroll was disabled
  });

  it('should scroll to the card when setExpandedCardId is called with scroll option', () => {
    const mockGetElementById = jest.fn().mockReturnValue({
      focus: jest.fn(),
      offsetTop: 200,
    });
    document.getElementById = mockGetElementById;

    const { result } = renderHook(() => useExpandedCard(spaceId));

    act(() => {
      result.current.setExpandedCardId(mockCardId, { scroll: true });
    });

    // Check that local storage and URL hash are updated
    expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#${mockCardId}`);

    // Ensure that scroll and focus were triggered
    setTimeout(() => {
      expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' });
    }, HEIGHT_ANIMATION_DURATION);
  });
});
