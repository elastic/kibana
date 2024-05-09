/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../types';

const Logo = (props: LogoProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none" viewBox="0 0 16 16">
    <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)"/>
    <defs>
      <radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)">
        <stop offset=".067" stop-color="#9168C0"/>
        <stop offset=".343" stop-color="#5684D1"/>
        <stop offset=".672" stop-color="#1BA1E3"/>
      </radialGradient>
      </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
