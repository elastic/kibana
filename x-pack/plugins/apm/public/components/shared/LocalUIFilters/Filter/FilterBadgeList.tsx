/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiBadge, EuiIcon } from '@elastic/eui';
import styled from 'styled-components';
import { unit, px, truncate } from '../../../../style/variables';

const BadgeText = styled.div`
  display: inline-block;
  ${truncate(px(unit * 8))};
  vertical-align: middle;
`;

interface Props {
  value: string[];
  onRemove: (val: string) => void;
}

const FilterBadgeList = ({ onRemove, value }: Props) => (
  <EuiFlexGrid gutterSize="s">
    {value.map((val) => (
      <EuiFlexItem key={val} grow={false}>
        <button
          type="button"
          onClick={() => {
            onRemove(val);
          }}
        >
          <EuiBadge color="hollow">
            <BadgeText>{val}</BadgeText>
            <EuiIcon type="cross" />
          </EuiBadge>
        </button>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

export { FilterBadgeList };
