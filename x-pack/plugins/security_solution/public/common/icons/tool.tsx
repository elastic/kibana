/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconTool: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 28H14V19.508L14.6 19.246C17.88 17.812 20 14.575 20 11C20 7.963 18.471 5.171 16 3.521V11H6V3.521C3.529 5.171 2 7.963 2 11C2 14.575 4.12 17.812 7.4 19.246L8 19.508V28H6V20.795C2.334 18.924 0 15.148 0 11C0 6.63 2.591 2.674 6.6 0.921998L8 0.309998V9H14V0.309998L15.4 0.921998C19.409 2.674 22 6.63 22 11C22 15.148 19.666 18.924 16 20.795V28Z"
      fill="#535766"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M6 32H16V30H6V32Z" fill="#00BFB3" />
  </svg>
);
