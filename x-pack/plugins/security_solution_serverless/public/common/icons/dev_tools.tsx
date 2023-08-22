/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconDevTools: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_2634_421128)">
      <g id="Group">
        <path
          id="Fill 1"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21 28H19V19.508L19.6 19.246C22.88 17.812 25 14.575 25 11C25 7.963 23.471 5.171 21 3.521V11H11V3.521C8.529 5.171 7 7.963 7 11C7 14.575 9.12 17.812 12.4 19.246L13 19.508V28H11V20.795C7.334 18.924 5 15.148 5 11C5 6.63 7.591 2.674 11.6 0.921998L13 0.309998V9H19V0.309998L20.4 0.921998C24.409 2.674 27 6.63 27 11C27 15.148 24.666 18.924 21 20.795V28Z"
          fill="#535766"
        />
        <path
          id="Fill 3"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11 32H21V30H11V32Z"
          fill="#00BFB3"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_2634_421128">
        <rect width="32" height="32" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconDevTools;
