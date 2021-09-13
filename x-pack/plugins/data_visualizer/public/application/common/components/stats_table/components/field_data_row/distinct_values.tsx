/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';

import React from 'react';

interface Props {
  cardinality?: number;
}

export const DistinctValues = ({ cardinality }: Props) => {
  if (cardinality === undefined) return null;
  return <EuiText size={'xs'}>{cardinality}</EuiText>;
};
