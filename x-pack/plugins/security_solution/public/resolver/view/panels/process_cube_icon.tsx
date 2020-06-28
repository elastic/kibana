/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useResolverTheme } from '../assets';

/**
 * During user testing, one user indicated they wanted to see stronger visual relationships between
 * Nodes on the graph and what's in the table. Using the same symbol in both places (as below) could help with that.
 */
export const CubeForProcess = memo(function CubeForProcess({
  isProcessTerminated,
  isProcessOrigin,
}: {
  isProcessTerminated: boolean;
  isProcessOrigin: boolean;
}) {
  const { cubeAssetsForNode } = useResolverTheme();
  const { cubeSymbol, descriptionText } = cubeAssetsForNode(isProcessTerminated, isProcessOrigin);

  return (
    <>
      <svg
        style={{ position: 'relative', top: '0.4em', marginRight: '.25em' }}
        className="table-process-icon"
        width="1.5em"
        height="1.5em"
        viewBox="0 0 1 1"
      >
        <desc>{descriptionText}</desc>
        <use
          role="presentation"
          xlinkHref={cubeSymbol}
          x={0}
          y={0}
          width={1}
          height={1}
          opacity="1"
          className="cube"
        />
      </svg>
    </>
  );
});
