/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { chartIconTreemapStyle } from './icons.styles';

export const ChartMosaicIcon = ({
  title = 'mosaic',
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 16 16"
    width={16}
    height={16}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId} /> : null}
    <path
      css={chartIconTreemapStyle}
      d="M2 0a1 1 0 00-1 1v1a1 1 0 001 1h2a1 1 0 001-1V1a1 1 0 00-1-1H4zM2 12a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H2zM6 10a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5zM6 7a1 1 0 001 1h2a1 1 0 001-1H10V6A1 1 0 009 5L7 5A1 1 0 006 6zM11 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM12 0a1 1 0 00-1 1v5a1 1 0 001 1h2a1 1 0 001-1V1a1 1 0 00-1-1h-2zM6 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1zM1 5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V5zM12 8a1 1 0 00-1 1v1a1 1 0 001 1h2a1 1 0 001-1V9a1 1 0 00-1-1z"
    />
  </svg>
);
