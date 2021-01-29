/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { px, unit } from '../../style/variables';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';
import { TimeComparison } from './time_comparison';
import { useBreakPoints } from '../../hooks/use_break_points';

const SearchBarFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeM} ${theme.eui.euiSizeM} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeM}`};
`;

interface Props {
  prepend?: React.ReactNode | string;
  showTimeComparison?: boolean;
}

function getRowDirection(showColumn: boolean) {
  return showColumn ? 'column' : 'row';
}

export function SearchBar({ prepend, showTimeComparison = false }: Props) {
  const { isMedium, isLarge } = useBreakPoints();
  const itemsStyle = { marginBottom: isLarge ? px(unit) : 0 };
  return (
    <SearchBarFlexGroup gutterSize="s" direction={getRowDirection(isLarge)}>
      <EuiFlexItem>
        <KueryBar prepend={prepend} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="flexEnd"
          gutterSize="s"
          direction={getRowDirection(isMedium)}
        >
          {showTimeComparison && (
            <EuiFlexItem style={{ ...itemsStyle, minWidth: px(300) }}>
              <TimeComparison />
            </EuiFlexItem>
          )}
          <EuiFlexItem style={itemsStyle}>
            <DatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </SearchBarFlexGroup>
  );
}
