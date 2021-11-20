/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

export const EuiIconLegend = ({ title, titleId, ...props }: { title: string; titleId: string }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M2.786.357a.25.25 0 01.428 0l2.559 4.264A.25.25 0 015.558 5H.442a.25.25 0 01-.215-.379L2.786.357zM3 1.944L4.234 4H1.766L3 1.944z"
    />
    <path d="M8.5 2a.5.5 0 000 1h7a.5.5 0 000-1h-7z" />
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M1.5 6a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zM2 7v2h2V7H2z"
    />
    <path d="M8.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z" />
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M3 16a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm0-1a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
    />
    <path d="M8.5 13a.5.5 0 000 1h7a.5.5 0 000-1h-7z" />
  </svg>
);
