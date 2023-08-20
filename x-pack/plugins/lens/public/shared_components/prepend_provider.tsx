/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EuiResizeObserverProps,
  useEuiTheme,
  EuiFormLabel,
  EuiResizeObserver,
} from '@elastic/eui';
import React, { createContext, useState, useContext, ReactChild, ReactChildren } from 'react';

export const PrependWidthContext = createContext<{
  minWidth: number;
  onResize: EuiResizeObserverProps['onResize'];
}>({
  minWidth: 0,
  onResize: () => {},
});

export const PrependWidthProvider = ({ children }: { children: ReactChild | ReactChildren }) => {
  const [minPrependWidth, setMinPrependWidth] = useState(0);

  const prependResizeObserver = ({ width }: { width: number }) => {
    if (width > minPrependWidth) {
      setMinPrependWidth(width);
    }
  };

  return (
    <PrependWidthContext.Provider
      value={{ minWidth: minPrependWidth, onResize: prependResizeObserver }}
    >
      {children}
    </PrependWidthContext.Provider>
  );
};

export const Prepend = ({ children }: { children: ReactChild | ReactChildren }) => {
  const { minWidth, onResize } = useContext(PrependWidthContext);

  const { euiTheme } = useEuiTheme();
  const paddingAffordance = parseInt(euiTheme.size.m, 10) * 2;

  return (
    <EuiFormLabel css={{ minWidth: Math.round(minWidth) + paddingAffordance }}>
      <EuiResizeObserver onResize={onResize}>
        {(resizeRef) => <span ref={resizeRef}>{children}</span>}
      </EuiResizeObserver>
    </EuiFormLabel>
  );
};
