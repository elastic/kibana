/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';

interface Props {
  cardinality?: number;
  showIcons: boolean;
}

export const DistinctValues = ({ cardinality, showIcons }: Props) => {
  if (cardinality === undefined) return null;
  return (
    <EuiFlexGroup alignItems={'center'}>
      {showIcons ? (
        <EuiFlexItem className={'dataVisualizerColumnHeaderIcon'}>
          <EuiIcon type="database" size={'s'} />
        </EuiFlexItem>
      ) : null}
      <EuiText size={'s'}>{cardinality}</EuiText>
    </EuiFlexGroup>
  );
};
