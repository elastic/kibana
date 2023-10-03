/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconReporting: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      id="Stroke 1"
      d="M20.833 7V5H21C22.6563 5 24 6.34372 24 8V28C24 29.6563 22.6563 31 21 31H3C1.34372 31 0 29.6563 0 28V8C0 6.34372 1.34372 5 3 5H3.167V7H3C2.44828 7 2 7.44828 2 8V28C2 28.5517 2.44828 29 3 29H21C21.5517 29 22 28.5517 22 28V8C22 7.44828 21.5517 7 21 7H20.833Z"
      fill="#535766"
    />
    <path
      id="Stroke 3"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19 9V3H15.874C15.4299 1.27477 13.8638 0 12 0C10.1362 0 8.57006 1.27477 8.12602 3H5V9H19ZM14 5H17V7H7V5H10V4C10 2.89543 10.8954 2 12 2C13.1046 2 14 2.89543 14 4V5Z"
      fill="#535766"
    />
    <path id="Stroke 5" d="M6 15V13H18V15H6Z" fill="#00BFB3" />
    <path id="Stroke 7" d="M6 20V18H18V20H6Z" fill="#00BFB3" />
    <path id="Stroke 9" d="M6 25V23H18V25H6Z" fill="#00BFB3" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconReporting;
