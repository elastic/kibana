/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { AdvancedFilter as Component } from './advanced_filter';

export interface Props {
  /** Optional value for the component */
  value?: string;
  /** Function to invoke when the filter value is committed */
  commit: (value: string) => void;
}

export const AdvancedFilter: React.FC<Props> = (props) => {
  const [value, setValue] = useState(props.value || '');

  return <Component {...props} value={value} onChange={setValue} />;
};
