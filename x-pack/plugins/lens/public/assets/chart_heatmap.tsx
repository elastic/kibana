/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';

export const LensIconChartHeatmap = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    width={30}
    height={22}
    viewBox="0 0 30 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      className="lensChartIcon__accent"
      d="M16 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V1zM0 17a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1v-4zm17-9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V9a1 1 0 00-1-1h-4zm-1 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zm9-17a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V1a1 1 0 00-1-1h-4z"
    />
    <path
      className="lensChartIcon__subdued"
      d="M0 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V1zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V9zm9-9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V1a1 1 0 00-1-1H9zM8 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V9zm1 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H9zm15-7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V9zm1 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4z"
    />
  </svg>
);
