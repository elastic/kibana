/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';
import { chartIconTreemapStyle } from './icons.styles';

export const ChartTreemapIcon = ({
  title = 'treemap',
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
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M0 0A1 1 0 010 0H5A1 1 0 015 0V16A1 1 0 015 16H0A1 1 0 010 16Z"
      css={chartIconTreemapStyle}
    />
    <path
      d="M8 0A1 1 0 018 0H15A1 1 0 0115 0V10A1 1 0 0115 10H5A1 1 0 015 10V0Z"
      css={chartIconTreemapStyle}
    />
    <path
      d="M5 10A1 1 0 005 10V16A1 1 0 005 16H15A1 1 0 0015 16V10A1 1 0 0015 10Z"
      css={chartIconTreemapStyle}
    />
  </svg>
);
