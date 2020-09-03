/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export const AppSearchLogo: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="136"
    height="136"
    viewBox="0 0 136 136"
    className="logo404"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="134" height="134" rx="67" strokeWidth="2" strokeDasharray="8 4" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M105.305 43.282l2.934-1.692c3.015 3.693 4.761 8.35 4.761 13.267V82.57a21 21 0 01-10.5 18.186L80 113.747V73.934c0-4.93-1.753-9.588-4.774-13.284l30.079-17.367zM66.5 55.747A21 21 0 0056 73.933v39.817l-22.5-12.993A21.001 21.001 0 0123 82.57V54.86c0-7.503 4.002-14.44 10.5-18.19l1.478-.853.022.014 33 19.05-1.5.867z"
      className="logo404__light"
    />
    <path
      d="M78.5 22.813a21.007 21.007 0 00-21 0L35 35.83l33 19.05 33.001-19.05-22.5-13.017z"
      fillRule="evenodd"
      clipRule="evenodd"
      className="logo404__dark"
    />
  </svg>
);
