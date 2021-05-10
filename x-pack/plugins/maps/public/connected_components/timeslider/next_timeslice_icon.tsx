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

export const NextTimesliceIcon: FunctionComponent<Props> = ({ title, titleId, ...props }) => (
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
      d="M13 3.227c0-.265.232-.48.5-.48.276 0 .5.22.5.48v10.54c0 .266-.232.48-.5.48-.276 0-.5-.22-.5-.48V3.228z"
      clipRule="evenodd"
    />
    <path d="M11.345 7.35l-7.2-4.392C3.21 2.388 2 3.043 2 4.108v8.785c0 1.064 1.21 1.72 2.146 1.149l7.2-4.393a1.336 1.336 0 000-2.298z" />
  </svg>
);
