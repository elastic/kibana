/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';

export const HeightRetainer: React.FC = (props) => {
  const containerElement = useRef<HTMLDivElement>(null);
  const minHeight = useRef<number>(0);

  useEffect(() => {
    if (containerElement.current) {
      const currentHeight = containerElement.current.clientHeight;
      if (minHeight.current < currentHeight) {
        minHeight.current = currentHeight;
      }
    }
  });

  return (
    <div
      {...props}
      ref={containerElement}
      style={{ minHeight: minHeight.current }}
    />
  );
};
