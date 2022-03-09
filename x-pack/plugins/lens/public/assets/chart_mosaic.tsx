/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const LensIconChartMosaic = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 30 22"
    width={30}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId} /> : null}
    <path
      className="lensChartIcon__subdued"
      d="M2 0a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V1a1 1 0 00-1-1H2zM2 14a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-6a1 1 0 00-1-1H2zM11 13a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-6a1 1 0 01-1-1v-8zM12 0a1 1 0 100 2h6a1 1 0 100-2h-6zM21 15a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6zM22 0a1 1 0 00-1 1v4a1 1 0 001 1h6a1 1 0 001-1V1a1 1 0 00-1-1h-6z"
    />
    <path
      className="lensChartIcon__accent"
      d="M11 5a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1h-6a1 1 0 01-1-1V5zM1 7a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V7zM22 8a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 00-1-1h-6z"
    />
  </svg>
);
