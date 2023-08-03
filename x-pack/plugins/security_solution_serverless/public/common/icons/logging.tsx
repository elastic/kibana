/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconLogging: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fillRule="evenodd" clipRule="evenodd" d="M9 20H21V18H9V20Z" fill="#00BFB3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M9 15H21V13H9V15Z" fill="#00BFB3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M9 10H21V8H9V10Z" fill="#00BFB3" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M30 6H26V5C26 3.897 26.897 3 28 3C29.103 3 30 3.897 30 5V6ZM22 29C20.897 29 20 28.103 20 27V24H6V5C6 3.897 6.897 3 8 3H24.556C24.212 3.591 24 4.269 24 5V27C24 28.103 23.103 29 22 29ZM4 29C2.897 29 2 28.103 2 27V26H18V27C18 27.728 18.195 28.411 18.537 29H4ZM28 1H8C5.794 1 4 2.794 4 5V24H0V27C0 29.206 1.794 31 4 31H22C24.206 31 26 29.206 26 27V8H32V5C32 2.794 30.206 1 28 1Z"
      fill="#535766"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconLogging;
