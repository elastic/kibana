/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const IconTriangle = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="16"
    height="12"
    fill="none"
    viewBox="0 0 16 12"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path fillRule="evenodd" d="M8 12h.47L16 0H0l7.53 12H8zm0-1.011L14.424.75H1.576L8 10.989z" />
  </svg>
);
