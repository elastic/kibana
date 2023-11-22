/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
// import { isTabbable } from 'tabbable';

const HEADER_OFFSET = 0;

export const useScrollToHash = () => {
  const location = useLocation();

  const [documentReadyState, setReadyState] = useState(document.readyState);
  useEffect(() => {
    const readyStateListener = () => setReadyState(document.readyState);
    document.addEventListener('readystatechange', readyStateListener);
    return () => document.removeEventListener('readystatechange', readyStateListener);
  }, []);

  // Scroll back to top of page when going to a completely separate page
  useEffect(() => {
    // For some annoying reason, the docs side nav using scrollIntoView() causes
    // the window to scroll as well, so we need to wrap this in a timeout to supersede it
    setTimeout(() => window.scrollTo(0, 0), 1);
  }, [location.pathname]);

  useEffect(() => {
    if (documentReadyState !== 'complete') return; // Wait for page to finish loading before scrolling

    const hash = location.hash.split('?')[0].replace('#', ''); // Remove any query params and the leading hash
    const element = hash ? document.getElementById(hash) : null;

    if (element) {
      // Wait a beat for layout to settle (especially when navigating to a hash of a new page)
      requestAnimationFrame(() => {
        // Focus element for keyboard and screen reader users
        // if (!isTabbable(element)) {
        //   element.tabIndex = -1;
        //   element.addEventListener('blur', () => element.removeAttribute('tabindex'), {
        //     once: true,
        //   });
        // }
        element.focus({ preventScroll: true }); // Scrolling already handled below
        // Scroll to element
        window.scrollTo({
          top: element.offsetTop - HEADER_OFFSET,
          behavior: 'smooth',
        });
      });
    } else {
      // Scroll back to top of page
      window.scrollTo({
        behavior: 'auto',
        top: 0,
      });
    }
  }, [location.hash, documentReadyState]);
};
