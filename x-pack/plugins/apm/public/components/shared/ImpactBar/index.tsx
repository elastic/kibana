/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiProgress } from '@elastic/eui';
import React from 'react';

interface Props extends StringMap<any> {
  value: any;
}

export function ImpactBar({ value, ...rest }: Props) {
  return (
    <EuiProgress size="l" value={value} max={100} color="subdued" {...rest} />
  );
}
