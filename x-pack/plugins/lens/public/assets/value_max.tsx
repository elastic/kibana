/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const ValueMaxIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg width="16" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8 0a.5.5 0 0 1 .384.18l2.5 3A.5.5 0 0 1 10.5 4h-5a.5.5 0 0 1-.384-.82l2.5-3A.5.5 0 0 1 8 0ZM.916 5.223A.5.5 0 0 0 0 5.5v5a.5.5 0 0 0 1 0V7.151l1.084 1.626a.5.5 0 0 0 .832 0L4 7.151V10.5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.916-.277L2.5 7.599.916 5.223Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.5 5h-.545l-.098.006a3.572 3.572 0 0 0-1.33.36 2.693 2.693 0 0 0-1.052.911C6.18 6.72 6 7.287 6 8v2.5a.5.5 0 0 0 1 0V9h2v1.5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Zm-.5.5V5v.5ZM7 8h2V6h-.011a2.57 2.57 0 0 0-.297.032c-.202.034-.463.1-.718.228a1.695 1.695 0 0 0-.667.572C7.133 7.092 7 7.462 7 8Z"
    />
    <path d="M11.188 5.11a.5.5 0 0 1 .702.078L13.5 7.2l1.61-2.012a.5.5 0 1 1 .78.624L14.14 8l1.75 2.188a.5.5 0 1 1-.78.624L13.5 8.8l-1.61 2.012a.5.5 0 0 1-.78-.624L12.86 8l-1.75-2.188a.5.5 0 0 1 .078-.702Z" />
  </svg>
);
