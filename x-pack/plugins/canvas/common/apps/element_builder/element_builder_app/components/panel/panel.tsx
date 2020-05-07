/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { useUIActions } from '../../hooks';

export interface Props {
  children: ReactNode[] | ReactNode;
  initialWidth?: string;
  style?: CSSProperties;
}

export function Panel({ children, initialWidth = '100%', style = {} }: Props) {
  const [width, setWidth] = useState(initialWidth);
  const { addPanel } = useUIActions();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    addPanel({
      initialWidth,
      setWidth(value) {
        setWidth(value + '%');
      },
      getWidth() {
        return divRef.current!.getBoundingClientRect().width;
      },
    });
  }, []);

  return (
    <div ref={divRef} style={{ ...style, width }}>
      {children}
    </div>
  );
}
