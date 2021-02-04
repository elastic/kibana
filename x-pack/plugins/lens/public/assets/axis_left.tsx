/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

export const EuiIconAxisLeft = ({
  title,
  titleId,
  ...props
}: {
  title: string;
  titleId: string;
}) => (
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
    <path d="M7.378 3.585a.5.5 0 00.353-.854L5.61.611a1.5 1.5 0 00-2.121 0L1.367 2.73a.5.5 0 00.708.707l2.12-2.12a.5.5 0 01.708 0l2.121 2.12a.5.5 0 00.354.147z" />
    <path d="M5.046 3.088v4.129l.005.04v5.658a.5.5 0 01-.992.09l-.01-.09V8.786l-.004-.04V3.087a.5.5 0 01.992-.09l.01.09z" />
    <path d="M4.55 15.829a1.5 1.5 0 001.06-.44l2.122-2.121a.5.5 0 10-.707-.707l-2.121 2.121a.5.5 0 01-.708 0l-2.12-2.121a.5.5 0 00-.708.707l2.121 2.121a1.5 1.5 0 001.061.44zM13.5 4a.5.5 0 01.5.5v7a.5.5 0 11-1 0v-7a.5.5 0 01.5-.5zM10.5 6.5a.5.5 0 011 0v5a.5.5 0 11-1 0v-5zM8.5 8a.5.5 0 00-.5.5v3a.5.5 0 101 0v-3a.5.5 0 00-.5-.5z" />
  </svg>
);
