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
  useResizeObserver,
} from '@elastic/eui';
import React, { createContext, useState, useContext, useEffect } from 'react';

export const PrependWidthContext = createContext<{
  minWidth: number;
  onResize: EuiResizeObserverProps['onResize'];
}>({
  minWidth: 0,
  onResize: () => {},
});

export const PrependWidthProvider = ({ children }: { children: React.ReactNode }) => {
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

export const Prepend = ({ children }: { children: React.ReactNode }) => {
  const { minWidth, onResize } = useContext(PrependWidthContext);

  const [resizeRef, setResizeRef] = useState<Element | null>(null);
  const width = useResizeObserver(resizeRef, 'width').width;

  const { euiTheme } = useEuiTheme();
  const paddingAffordance = parseInt(euiTheme.size.m, 10) * 2;

  useEffect(() => {
    onResize({ width, height: 0 });
  }, [width, onResize]);

  return (
    <EuiFormLabel css={{ minWidth: Math.round(minWidth) + paddingAffordance }}>
      <span style={{ display: 'inline-block' }} ref={setResizeRef}>
        {children}
      </span>
    </EuiFormLabel>
  );
};
