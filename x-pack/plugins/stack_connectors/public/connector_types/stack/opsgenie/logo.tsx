/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../../types';

const Logo = (props: LogoProps) => (
  <svg width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M152.496 152.116c42.006 0 76.058-34.052 76.058-76.058C228.554 34.052 194.502 0 152.496 0c-42.005 0-76.058 34.052-76.058 76.058 0 42.006 34.053 76.058 76.058 76.058Z"
      fill="url(#a)"
    />
    <path
      d="M146.016 302.953a366.908 366.908 0 0 1-120.44-125.897 8.526 8.526 0 0 1 3.71-11.809l57.597-28.266a8.526 8.526 0 0 1 11.128 3.411 284.755 284.755 0 0 0 123.636 111.912 368.755 368.755 0 0 1-62.671 50.649 12.234 12.234 0 0 1-12.96 0Z"
      fill="url(#b)"
    />
    <path
      d="M158.976 302.953a366.659 366.659 0 0 0 120.44-125.897 8.53 8.53 0 0 0-3.667-11.809l-57.64-28.266a8.527 8.527 0 0 0-11.128 3.411A284.623 284.623 0 0 1 83.345 252.304a366.652 366.652 0 0 0 62.671 50.649 12.234 12.234 0 0 0 12.96 0Z"
      fill="#2684FF"
    />
    <defs>
      <linearGradient
        id="a"
        x1="152.496"
        y1="25.282"
        x2="152.496"
        y2="181.448"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2684FF" />
        <stop offset=".82" stopColor="#0052CC" />
      </linearGradient>
      <linearGradient
        id="b"
        x1="105.685"
        y1="188.682"
        x2="146.589"
        y2="274.292"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2684FF" />
        <stop offset=".62" stopColor="#0052CC" />
      </linearGradient>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
