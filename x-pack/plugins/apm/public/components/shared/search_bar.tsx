/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';

const SearchBarFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeM} ${theme.eui.euiSizeM} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeM}`};
`;

export function SearchBar(props: { prepend?: React.ReactNode | string }) {
  return (
    <SearchBarFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem grow={3}>
        <KueryBar prepend={props.prepend} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <DatePicker />
      </EuiFlexItem>
    </SearchBarFlexGroup>
  );
}
