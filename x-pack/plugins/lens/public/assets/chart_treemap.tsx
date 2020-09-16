/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const LensIconChartTreemap = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
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
    <path
      d="M0 1a1 1 0 011-1h13a1 1 0 011 1v20a1 1 0 01-1 1H1a1 1 0 01-1-1V1z"
      className="lensChartIcon__subdued"
    />
    <path
      d="M17 1a1 1 0 011-1h11a1 1 0 011 1v12a1 1 0 01-1 1H18a1 1 0 01-1-1V1z"
      className="lensChartIcon__accent"
    />
    <path
      d="M29 16H18a1 1 0 00-1 1v4a1 1 0 001 1h11a1 1 0 001-1v-4a1 1 0 00-1-1z"
      className="lensChartIcon__subdued"
    />
  </svg>
);
