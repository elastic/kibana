/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const ValueMinIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg width="16" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M10.367.018a.5.5 0 0 1 .562.225L13 3.695V.5a.5.5 0 0 1 1 0v5a.5.5 0 0 1-.929.257L11 2.305V5.5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .367-.482ZM.916.223A.5.5 0 0 0 0 .5v5a.5.5 0 0 0 1 0V2.151l1.084 1.626a.5.5 0 0 0 .832 0L4 2.151V5.5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.916-.277L2.5 2.599.916.223ZM7 11a.5.5 0 0 0 .384-.18l2.5-3A.5.5 0 0 0 9.5 7h-5a.5.5 0 0 0-.384.82l2.5 3A.5.5 0 0 0 7 11ZM6.5 0a.5.5 0 0 0 0 1H7v4h-.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H8V1h.5a.5.5 0 0 0 0-1h-2Z" />
  </svg>
);
