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

export const PreviousTimesliceIcon: FunctionComponent<Props> = ({ title, titleId, ...props }) => (
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
      d="M3 3.227a.495.495 0 00-.5-.48c-.276 0-.5.22-.5.48v10.54c0 .266.232.48.5.48.276 0 .5-.22.5-.48V3.228z"
      clipRule="evenodd"
    />
    <path d="M4.654 7.35l7.2-4.392c.936-.57 2.146.085 2.146 1.15v8.785c0 1.064-1.21 1.72-2.146 1.149l-7.2-4.393a1.336 1.336 0 010-2.298z" />
  </svg>
);
