/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

export const useScrollToTop = () => {
  useEffect(() => {
    // trying to use new API - https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo
    if (window.scroll) {
      window.scroll(0, 0);
    } else {
      // just a fallback for older browsers
      window.scrollTo(0, 0);
    }
  });

  // renders nothing, since nothing is needed
  return null;
};
