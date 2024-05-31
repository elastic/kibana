/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';

export function ResettingHeightRetainer(
  props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    reset?: boolean;
  }
) {
  const { reset, ...containerProps } = props;
  const resetRef = useRef(reset);
  const containerRef = useRef<HTMLDivElement>(null);

  const minHeightRef = useRef(0);

  if (resetRef.current !== reset) {
    minHeightRef.current = reset ? 0 : containerRef.current?.clientHeight ?? 0;

    resetRef.current = reset;
  }

  return <div {...containerProps} ref={containerRef} style={{ minHeight: minHeightRef.current }} />;
}
