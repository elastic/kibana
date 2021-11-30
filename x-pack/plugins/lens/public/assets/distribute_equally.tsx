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
    <path d="M4 0.5C4 0.223858 4.22386 0 4.5 0C4.77614 0 5 0.223858 5 0.5V11.5C5 11.7761 4.77614 12 4.5 12C4.22386 12 4 11.7761 4 11.5V0.5Z" />
    <path d="M0 3C0 2.44772 0.447715 2 1 2H3V10H1C0.447715 10 0 9.55229 0 9V3Z" />
    <path d="M10.5 0C10.2239 0 10 0.223858 10 0.5V11.5C10 11.7761 10.2239 12 10.5 12C10.7761 12 11 11.7761 11 11.5V0.5C11 0.223858 10.7761 0 10.5 0Z" />
    <path d="M6 2H9V10H6V2Z" />
    <path d="M14 2H12V10H14C14.5523 10 15 9.55229 15 9V3C15 2.44772 14.5523 2 14 2Z" />
  </svg>
);
