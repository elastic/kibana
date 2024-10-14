/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useExpandedCard } from './use_expanded_card';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';
import type { OnboardingCardId } from '../../../constants';
import { mockReportCardOpen } from '../../__mocks__/onboarding_context_mocks';
import { waitFor } from '@testing-library/react';

const scrollTimeout = HEIGHT_ANIMATION_DURATION + 50;

const mockSetStorageExpandedCardId = jest.fn();
const mockUseStoredExpandedCardId = jest.fn(() => [null, mockSetStorageExpandedCardId]);
jest.mock('../../../hooks/use_stored_state', () => ({
  ...jest.requireActual('../../../hooks/use_stored_state'),
  useStoredExpandedCardId: () => mockUseStoredExpandedCardId(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ hash: '#card-1', pathname: '/test' }),
}));

jest.mock('../../onboarding_context');

describe('useExpandedCard Hook', () => {
  const mockCardId = 'card-1' as OnboardingCardId;
  const mockScrollTo = jest.fn();
  global.window.scrollTo = mockScrollTo;
  const mockReplaceState = jest.fn();
  global.history.replaceState = mockReplaceState;

  const mockGetElementById = jest.fn().mockReturnValue({
    focus: jest.fn(),
    offsetTop: 100,
  });
  document.getElementById = mockGetElementById;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the page is loading', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        configurable: true,
      });
    });

    it('should not scroll if the page is not fully loaded', async () => {
      renderHook(useExpandedCard);

      // Ensure that scroll and focus were triggered
      await waitFor(
        () => {
          expect(mockScrollTo).not.toHaveBeenCalled();
        },
        { timeout: scrollTimeout }
      );
    });
  });

  describe('when the page is completely loaded', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        configurable: true,
      });
      renderHook(useExpandedCard);
    });

    it('should set the expanded card id from the hash', () => {
      expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
    });

    it('should scroll to the expanded card id from the hash', async () => {
      // Ensure that scroll and focus were triggered
      await waitFor(
        () => {
          expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
          expect(mockScrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' });
        },
        { timeout: scrollTimeout }
      );
    });

    it('should report the expanded card id from the hash', () => {
      expect(mockReportCardOpen).toHaveBeenCalledWith(mockCardId, { auto: true });
    });
  });

  describe('when the card is expanded manually', () => {
    beforeEach(() => {
      mockGetElementById.mockReturnValueOnce({
        focus: jest.fn(),
        offsetTop: 200,
      });
    });

    describe('when scroll is disabled', () => {
      beforeEach(() => {
        const { result } = renderHook(useExpandedCard);
        act(() => {
          result.current.setExpandedCardId(mockCardId, { scroll: false });
        });
      });

      it('should set the expanded card id in storage', () => {
        expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
      });

      it('should set the URL hash', () => {
        expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#${mockCardId}`);
      });

      it('should not scroll', async () => {
        // Ensure that scroll and focus were triggered
        await waitFor(
          () => {
            expect(mockGetElementById).not.toHaveBeenCalled();
            expect(mockScrollTo).not.toHaveBeenCalled();
          },
          { timeout: scrollTimeout }
        );
      });

      it('should report the expanded card id', () => {
        expect(mockReportCardOpen).toHaveBeenCalledWith(mockCardId);
      });
    });

    describe('when scroll is enabled', () => {
      beforeEach(() => {
        const { result } = renderHook(useExpandedCard);
        act(() => {
          result.current.setExpandedCardId(mockCardId, { scroll: true });
        });
      });

      it('should set the expanded card id in storage', () => {
        expect(mockSetStorageExpandedCardId).toHaveBeenCalledWith(mockCardId);
      });

      it('should set the URL hash', () => {
        expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#${mockCardId}`);
      });

      it('should scroll', async () => {
        // Ensure that scroll and focus were triggered
        await waitFor(
          () => {
            expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
            expect(mockScrollTo).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' });
          },
          { timeout: scrollTimeout }
        );
      });

      it('should report the expanded card id', () => {
        expect(mockReportCardOpen).toHaveBeenCalledWith(mockCardId);
      });
    });
  });
});
