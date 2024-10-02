/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';

export const IconNotes: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
      d="M15 13H6V15H15V13ZM22 18H6V20H22V18ZM6 23H22V25H6V23Z"
      fill="#017D73"
    />
    <path
      d="M19.41 0H3C1.34315 0 0 1.34315 0 3V29C0 30.6569 1.34315 32 3 32H25C26.6569 32 28 30.6569 28 29V8.59L19.41 0ZM20 3.41L24.59 8H20V3.41ZM25 30H3C2.44772 30 2 29.5523 2 29V3C2 2.44772 2.44772 2 3 2H18V10H26V29C26 29.5523 25.5523 30 25 30Z"
      fill="#343741"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconNotes;
