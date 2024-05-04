/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

export function whenIdle(doWork: () => void) {
  const requestIdleCallback = window.requestIdleCallback || window.setTimeout;
  if (document.readyState === 'complete') {
    requestIdleCallback(() => doWork());
  } else {
    window.addEventListener('load', () => {
      requestIdleCallback(() => doWork());
    });
  }
}

/**
 * Postpone rendering of children until the page is loaded and browser is idle.
 */
export const WhenIdle: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [idleFired, setIdleFired] = React.useState(false);

  React.useEffect(() => {
    whenIdle(() => {
      setIdleFired(true);
    });
  }, []);

  return idleFired ? <>{children}</> : null;
};
