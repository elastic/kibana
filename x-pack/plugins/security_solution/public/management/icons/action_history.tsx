/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconActionHistory: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
      fill="#535766"
      d="M29 9H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3zM3 2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h26a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="#00BFB3"
      d="M29 32H3a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3zM3 13a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h26a1 1 0 0 0 1-1V14a1 1 0 0 0-1-1H3z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="#535766"
      d="m7.29 17.71 3.3 3.29-3.3 3.29 1.42 1.42 4.7-4.71-4.7-4.71zM15 24h9v2h-9z"
    />
  </svg>
);
