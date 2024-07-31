/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../types';

const Logo = (props: LogoProps) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    fill="none"
    viewBox="0 0 16 16"
  >
    <path
      d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
      fill="#000000"
    />
    <path
      d="M14 8.016A6.522 6.522 0 008.016 14h-.032A6.521 6.521 0 001 8.016v-.032A6.521 6.521 0 007.984 1h.032A6.522 6.522 0 0014 7.984v.032z"
      fill="#FFFFFF"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
