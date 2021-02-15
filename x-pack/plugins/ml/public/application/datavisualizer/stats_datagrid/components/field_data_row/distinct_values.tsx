/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';

export const DistinctValues = ({ cardinality }: { cardinality?: number }) => {
  if (cardinality === undefined) return null;
  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem style={{ maxWidth: 10 }}>
        <EuiIcon type="database" size={'s'} />
      </EuiFlexItem>
      <EuiText size={'s'}>
        <b>{cardinality}</b>
      </EuiText>
    </EuiFlexGroup>
  );
};
