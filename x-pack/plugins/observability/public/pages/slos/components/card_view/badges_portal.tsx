/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import ReactDOM from 'react-dom';
export interface Props {
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
  index?: number;
}

export function SloCardBadgesPortal({ children, containerRef, index }: Props) {
  const portalNode = useMemo(() => createHtmlPortalNode(), []);
  useEffect(() => {
    if (containerRef?.current) {
      setTimeout(() => {
        const gapDivs = containerRef?.current?.querySelectorAll('.echMetricText__gap');
        if (!gapDivs?.[index ?? 0]) return;
        ReactDOM.render(<OutPortal node={portalNode} />, gapDivs[index ?? 0]);
      }, 100);
    }

    return () => {
      portalNode.unmount();
    };
  }, [portalNode, containerRef, index]);

  return <InPortal node={portalNode}>{children}</InPortal>;
}
