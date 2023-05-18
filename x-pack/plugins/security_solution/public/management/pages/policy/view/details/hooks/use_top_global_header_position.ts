/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

interface TopGlobalHeaderPositionResponse {
  top: number;
  bottom: number;
}

export const useTopGlobalHeaderPosition = (): TopGlobalHeaderPositionResponse => {
  return useMemo(() => {
    const $globalHeadersEle = window.document.getElementById('globalHeaderBars');

    if ($globalHeadersEle) {
      const $bottomBar = $globalHeadersEle.lastElementChild;

      if ($bottomBar) {
        const { bottom, top } = $bottomBar.getBoundingClientRect();

        return {
          top,
          bottom,
        };
      }
    }

    return {
      top: 0,
      bottom: 0,
    };
  }, []);
};
