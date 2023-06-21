/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconFilter: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <g clipPath="url(#clip0_2667_425201)">
      <path fillRule="evenodd" clipRule="evenodd" d="M7 2L14 2V4L7 4V2Z" fill="#00BFB3" />
      <path fillRule="evenodd" clipRule="evenodd" d="M11 8H19V10L11 10V8Z" fill="#00BFB3" />
      <path fillRule="evenodd" clipRule="evenodd" d="M14 13H18V15H14V13Z" fill="#00BFB3" />
      <path fillRule="evenodd" clipRule="evenodd" d="M18 4L24 4V6L18 6V4Z" fill="#00BFB3" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 26C3 24.8954 3.89543 24 5 24H26C27.1046 24 28 24.8954 28 26V30C28 31.1046 27.1046 32 26 32H5C3.89543 32 3 31.1046 3 30V26ZM26 26H5V30H26V26Z"
        fill="#00BFB3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21 16.8398L31.7497 4.66178L30.2503 3.33823L19 16.0833V22H21V16.8398Z"
        fill="#535766"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 16.8132L0.220071 4.62587L1.77993 3.37413L12 16.1099V22H10V16.8132Z"
        fill="#535766"
      />
    </g>
    <defs>
      <clipPath id="clip0_2667_425201">
        <rect width="32" height="32" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
