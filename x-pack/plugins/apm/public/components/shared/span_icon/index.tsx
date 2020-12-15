/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { px } from '../../../style/variables';
import { getSpanIcon } from './get_span_icon';

interface Props {
  type?: string;
  subType?: string;
}

export function SpanIcon({ type, subType }: Props) {
  const icon = getSpanIcon(type, subType);

  return <img src={icon} height={px(24)} alt={type || subType} />;
}
