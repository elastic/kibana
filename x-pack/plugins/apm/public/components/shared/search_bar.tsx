/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';
import { TimeComparison } from './time_comparison';

const SearchBarFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeM} ${theme.eui.euiSizeM} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeM}`};
`;

interface Props {
  prepend?: React.ReactNode | string;
  showTimeComparison?: boolean;
}

export function SearchBar({ prepend, showTimeComparison = false }: Props) {
  return (
    <SearchBarFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem grow={3}>
        <KueryBar prepend={prepend} />
      </EuiFlexItem>
      {showTimeComparison && (
        <EuiFlexItem>
          <TimeComparison />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={1}>
        <DatePicker />
      </EuiFlexItem>
    </SearchBarFlexGroup>
  );
}
