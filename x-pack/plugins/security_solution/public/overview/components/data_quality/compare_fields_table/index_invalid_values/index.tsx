/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { EMPTY_PLACEHOLDER } from '../helpers';

const IndexInvalidValueFlexItem = styled(EuiFlexItem)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  indexInvalidValues: string[];
}

const IndexInvalidValuesComponent: React.FC<Props> = ({ indexInvalidValues }) =>
  indexInvalidValues.length === 0 ? (
    <EuiCode>{EMPTY_PLACEHOLDER}</EuiCode>
  ) : (
    <EuiFlexGroup direction="column" gutterSize="none">
      {indexInvalidValues.map((x, i) => (
        <IndexInvalidValueFlexItem grow={false} key={`${x}_${i}`}>
          <EuiCode>{x}</EuiCode>
        </IndexInvalidValueFlexItem>
      ))}
    </EuiFlexGroup>
  );

IndexInvalidValuesComponent.displayName = 'IndexInvalidValuesComponent';

export const IndexInvalidValues = React.memo(IndexInvalidValuesComponent);
