/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const LensIconChartBarPercentage = ({
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
      d="M6 13v8a1 1 0 01-1 1H1a1 1 0 01-1-1v-8h6zm8-4v12a1 1 0 01-1 1H9a1 1 0 01-1-1V9h6zm8 4v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8h6zm8 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7h6z"
      className="lensChartIcon__subdued"
    />
    <path
      d="M29 0a1 1 0 011 1v11h-6V1a1 1 0 011-1h4zM5 0a1 1 0 011 1v10H0V1a1 1 0 011-1h4zm16 0a1 1 0 011 1v10h-6V1a1 1 0 011-1h4zm-8 0a1 1 0 011 1v6H8V1a1 1 0 011-1h4z"
      className="lensChartIcon__accent"
    />
  </svg>
);
