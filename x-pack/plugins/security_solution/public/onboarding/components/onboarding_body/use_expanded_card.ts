/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStoredExpandedCardId } from '../use_stored_state';
import { HEIGHT_ANIMATION_DURATION } from './onboarding_card_panel.styles';
import type { OnboardingCardId } from '../../constants';

const HEADER_OFFSET = 40;

/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 * Scenarios in the initial render:
 * - Hash not defined and LS not defined: No card expanded and no scroll
 * - Hash not defined and LS defined: Update hash with LS value and scroll to the card
 * - Hash defined and LS not defined: Update LS with hash value and scroll to the card
 * - Hash defined and LS defined: The hash value takes precedence, update LS if different and scroll to the card
 */
export const useExpandedCard = (spaceId: string) => {
  const [expandedCardId, setExpandedCardId] = useStoredExpandedCardId(spaceId);
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
      // Use the expanded card id if we have it stored and the hash is empty.
      // The hash will be synched by the effect below
      cardIdFromHash = expandedCardId;
    }

    // If the hash is different from the expanded card id, update the expanded card id (fresh load)
    if (expandedCardId !== cardIdFromHash) {
      setExpandedCardId(cardIdFromHash);
    }

    setTimeout(() => {
      const element = document.getElementById(cardIdFromHash);
      if (element) {
        element.focus({ preventScroll: true }); // Scrolling already handled below
        window.scrollTo({ top: element.offsetTop - HEADER_OFFSET, behavior: 'smooth' });
      }
    }, HEIGHT_ANIMATION_DURATION);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentReadyState]);

  // Syncs the expanded card id with the hash, it does not trigger the scrolling effect
  useEffect(() => {
    history.replaceState(null, '', expandedCardId == null ? ' ' : `#${expandedCardId}`);
  }, [expandedCardId]);

  return { expandedCardId, setExpandedCardId };
};
