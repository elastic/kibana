/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const DistributeEquallyIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="15"
    height="12"
    viewBox="0 0 15 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M4 .5a.5.5 0 0 1 1 0v11a.5.5 0 0 1-1 0V.5ZM0 3a1 1 0 0 1 1-1h2v8H1a1 1 0 0 1-1-1V3ZM10.5 0a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 1 0V.5a.5.5 0 0 0-.5-.5ZM6 2h3v8H6V2ZM14 2h-2v8h2a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
  </svg>
);
