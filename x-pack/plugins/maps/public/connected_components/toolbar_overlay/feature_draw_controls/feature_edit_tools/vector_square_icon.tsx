/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

export const VectorSquareIcon: FunctionComponent = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M1.5 2a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v12a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5V2zm1 .5v11h11v-11h-11z"
      clipRule="evenodd"
    />
  </svg>
);
