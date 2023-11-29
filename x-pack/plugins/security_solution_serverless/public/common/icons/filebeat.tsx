/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconFilebeat: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5 2C4.44828 2 4 2.44828 4 3V29C4 29.5517 4.44828 30 5 30H27C27.5517 30 28 29.5517 28 29V9.41421L20.5858 2H5ZM2 3C2 1.34372 3.34372 0 5 0H21.4142L30 8.58579V29C30 30.6563 28.6563 32 27 32H5C3.34372 32 2 30.6563 2 29V3Z"
      fill="#535966"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M20 1H22V8H29V10H20V1Z" fill="#535966" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24 20H8V18H24V20Z" fill="#00BFB3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M17 15H8V13H17V15Z" fill="#00BFB3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24 25H8V23H24V25Z" fill="#00BFB3" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconFilebeat;
