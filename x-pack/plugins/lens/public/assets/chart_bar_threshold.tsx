/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const LensIconChartBarThreshold = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 30 22"
    width={30}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g>
      <path
        className="lensChartIcon__subdued"
        d="m5,7a1,1 0 0 1 1,1l0,13a1,1 0 0 1 -1,1l-4,0a1,1 0 0 1 -1,-1l0,-13a1,1 0 0 1 1,-1l4,0zm16,-7a1,1 0 0 1 1,1l0,20a1,1 0 0 1 -1,1l-4,0a1,1 0 0 1 -1,-1l0,-20a1,1 0 0 1 1,-1l4,0z"
      />
      <path className="lensChartIcon__accent" d="m0,10l60,0" />
    </g>
  </svg>
);
