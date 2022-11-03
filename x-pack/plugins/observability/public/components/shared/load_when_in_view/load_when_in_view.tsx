/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import useIntersection from 'react-use/lib/useIntersection';

export interface LoadWhenInViewProps {
  children: JSX.Element;
  minHeight?: string | number;
  placeholder: string;
}

// eslint-disable-next-line import/no-default-export
export default function LoadWhenInView({
  children,
  placeholder,
  minHeight = 100,
}: LoadWhenInViewProps) {
  const intersectionRef = React.useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 0.25,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (intersection && intersection.intersectionRatio > 0.25) {
      setIsVisible(true);
    }
  }, [intersection, intersection?.intersectionRatio]);

  return (
    <div
      {...(!isVisible ? { region: undefined, 'aria-label': placeholder } : {})}
      ref={intersectionRef}
      style={!isVisible && minHeight ? { height: minHeight } : {}}
    >
      {!isVisible ? <EuiLoadingContent /> : children}
    </div>
  );
}
