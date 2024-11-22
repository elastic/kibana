/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';
import { type OnboardingCardId } from '../../../constants';
import type { SetExpandedCardId } from '../../../types';
import { getCardIdFromHash, useUrlDetail } from '../../../hooks/use_url_detail';

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

/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 */
export const useExpandedCard = () => {
  const { setCardDetail } = useUrlDetail();

  // The hash in the url is the Single Source of Truth for the expanded card id
  const { hash } = useLocation();
  const cardIdFromHash = getCardIdFromHash(hash);

  const [cardId, setCardId] = useState<OnboardingCardId | null>(cardIdFromHash);

  // This effect implements auto-scroll in the initial render, it only needs to be executed once per page load.
  useEffect(() => {
    if (cardId) {
      scrollToCard(cardId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setExpandedCardId = useCallback<SetExpandedCardId>(
    (newCardId, options) => {
      setCardId(newCardId);
      setCardDetail(newCardId);
      if (newCardId != null && options?.scroll) {
        scrollToCard(newCardId);
      }
    },
    [setCardDetail]
  );

  return { expandedCardId: cardId, setExpandedCardId };
};
