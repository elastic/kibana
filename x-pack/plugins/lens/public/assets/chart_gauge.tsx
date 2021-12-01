/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';

export const LensIconChartGaugeHorizontal = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="30"
    height="22"
    viewBox="0 0 30 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      className="lensChartIcon__subdued"
      d="M1 13a1 1 0 00-1 1v2a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-2a1 1 0 00-1-1H1z"
    />
    <path
      className="lensChartIcon__accent"
      d="M0 6a1 1 0 011-1h24a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V6z"
    />
  </svg>
);

export const LensIconChartGaugeVertical = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="30"
    height="22"
    viewBox="0 0 30 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      className="lensChartIcon__accent"
      d="M16 22a1 1 0 01-1-1V4a1 1 0 011-1h4a1 1 0 011 1v17a1 1 0 01-1 1h-4z"
    />
    <path
      className="lensChartIcon__subdued"
      d="M10 0h2a1 1 0 011 1v20a1 1 0 01-1 1h-2a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1V7h-1a1 1 0 010-2h1V2h-1a1 1 0 010-2z"
    />
  </svg>
);
