/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiBadge } from '@elastic/eui';
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

function FilterBadgeList({ onRemove, value }: Props) {
  return (
    <EuiFlexGrid gutterSize="s">
      {value.map((val) => (
        <EuiFlexItem key={val} grow={false}>
          <EuiBadge
            color="hollow"
            onClick={() => {
              onRemove(val);
            }}
            onClickAriaLabel="Remove filter"
            iconOnClick={() => {
              onRemove(val);
            }}
            iconOnClickAriaLabel="Remove filter"
            iconType="cross"
            iconSide="right"
          >
            <BadgeText>{val}</BadgeText>
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}

export { FilterBadgeList };
