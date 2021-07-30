/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { getSpanIcon } from './get_span_icon';

interface Props {
  type?: string;
  subtype?: string;
}

export function SpanIcon({ type, subtype }: Props) {
  const icon = getSpanIcon(type, subtype);

  return <EuiIcon type={icon} size="l" title={type || subtype} />;
}
