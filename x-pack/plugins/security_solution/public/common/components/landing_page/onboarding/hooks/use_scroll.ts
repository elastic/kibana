/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HEIGHT_ANIMATION_DURATION } from '../styles/card_step.styles';

const HEADER_OFFSET = 40;

export const useScrollToHash = () => {
  const location = useLocation();

  const [documentReadyState, setReadyState] = useState(document.readyState);
  useEffect(() => {
    const readyStateListener = () => setReadyState(document.readyState);
    document.addEventListener('readystatechange', readyStateListener);
    return () => document.removeEventListener('readystatechange', readyStateListener);
  }, []);

  useEffect(() => {
    if (documentReadyState !== 'complete') return; // Wait for page to finish loading before scrolling

    const hash = location.hash.split('?')[0].replace('#', '');
    const element = hash ? document.getElementById(hash) : null;

    if (element) {
      // Wait for transition to complete before scrolling
      setTimeout(() => {
        element.focus({ preventScroll: true }); // Scrolling already handled below

        window.scrollTo({
          top: element.offsetTop - HEADER_OFFSET,
          behavior: 'smooth',
        });
      }, HEIGHT_ANIMATION_DURATION);
    }
  }, [location.hash, documentReadyState]);
};
