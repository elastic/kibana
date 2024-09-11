/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStoredExpandedCardId } from '../use_stored_state';
import { HEIGHT_ANIMATION_DURATION } from './onboarding_card_panel.styles';
import type { OnboardingCardId } from '../../constants';
import type { SetExpandedCardId } from '../../types';

const HEADER_OFFSET = 40;

const scrollToCard = (cardId: OnboardingCardId) => {
  setTimeout(() => {
    const element = document.getElementById(cardId);
    if (element) {
      element.focus({ preventScroll: true });
      window.scrollTo({ top: element.offsetTop - HEADER_OFFSET, behavior: 'smooth' });
    }
  }, HEIGHT_ANIMATION_DURATION);
};

const setHash = (cardId: OnboardingCardId | null) => {
  history.replaceState(null, '', cardId == null ? ' ' : `#${cardId}`);
};

/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 */
export const useExpandedCard = (spaceId: string) => {
  const [expandedCardId, setStorageExpandedCardId] = useStoredExpandedCardId(spaceId);
  const location = useLocation();

  const [documentReadyState, setReadyState] = useState(document.readyState);

  useEffect(() => {
    const readyStateListener = () => setReadyState(document.readyState);
    document.addEventListener('readystatechange', readyStateListener);
    return () => document.removeEventListener('readystatechange', readyStateListener);
  }, []);

  // This effect implements auto-scroll in the initial render, further changes in the hash should not trigger this effect
  useEffect(() => {
    if (documentReadyState !== 'complete') return; // Wait for page to finish loading before scrolling
    let cardIdFromHash = location.hash.split('?')[0].replace('#', '') as OnboardingCardId | '';
    if (!cardIdFromHash) {
      if (expandedCardId == null) return;
      // If the hash is empty, but it is defined the storage we use the storage value
      cardIdFromHash = expandedCardId;
      setHash(cardIdFromHash);
    }

    // If the hash is defined and different from the storage, the hash takes precedence
    if (expandedCardId !== cardIdFromHash) {
      setStorageExpandedCardId(cardIdFromHash);
    }
    scrollToCard(cardIdFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentReadyState]);

  const setExpandedCardId = useCallback<SetExpandedCardId>(
    (cardId, options) => {
      setStorageExpandedCardId(cardId);
      setHash(cardId);
      if (cardId && options?.scroll) {
        scrollToCard(cardId);
      }
    },
    [setStorageExpandedCardId]
  );

  return { expandedCardId, setExpandedCardId };
};
