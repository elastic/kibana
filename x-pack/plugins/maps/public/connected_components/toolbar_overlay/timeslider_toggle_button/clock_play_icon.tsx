/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

interface Props {
  title?: string;
  titleId?: string;
}

export const ClockPlayIcon: FunctionComponent<Props> = ({ title, titleId, ...props }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      d="M8 13.923A5.93 5.93 0 0013.923 8 5.93 5.93 0 008 2.077 5.93 5.93 0 002.077 8 5.93 5.93 0 008 13.923zM8 1a7 7 0 110 14A7 7 0 018 1zM4.77 7.462h2.692v-3.77a.539.539 0 011.076 0V8A.539.539 0 018 8.538H4.77a.539.539 0 010-1.076z"
      clipRule="evenodd"
    />
    <circle cx="12" cy="12" r="4" />
    <path
      fill="#fff"
      d="M13.998 11.922l-2.806-1.905a.099.099 0 00-.1-.006.095.095 0 00-.052.084v3.81c0 .035.02.068.052.084a.098.098 0 00.1-.006l2.806-1.905a.094.094 0 000-.156z"
    />
  </svg>
);
