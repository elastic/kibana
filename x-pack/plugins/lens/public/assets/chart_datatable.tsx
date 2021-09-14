/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const LensIconChartDatatable = ({
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
    <path
      d="M11 18a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1h10zm0-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1h10zm0-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1V7a1 1 0 011-1h10zm18-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1V1a1 1 0 011-1h28z"
      className="lensChartIcon__subdued"
    />
    <path
      d="M20 18a1 1 0 011 1v2a1 1 0 01-.883.993L20 22h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm-9-6a1 1 0 011 1v2a1 1 0 01-.883.993L20 16h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm-9-6a1 1 0 011 1v2a1 1 0 01-.883.993L20 10h-5a1 1 0 01-1-1V7a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1V7a1 1 0 011-1h5z"
      className="lensChartIcon__accent"
    />
  </svg>
);
