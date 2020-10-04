/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { AndOrBadge } from '../and_or_badge';

const MyInvisibleAndBadge = styled(EuiFlexItem)`
  visibility: hidden;
`;

const MyFirstRowContainer = styled(EuiFlexItem)`
  padding-top: 20px;
`;

interface AndBadgeRowProps {
  entriesLength: number;
  entryItemIndex: number;
}

export const AndBadgeRowComponent = React.memo<AndBadgeRowProps>(
  ({ entriesLength, entryItemIndex }) => {
    const badge = <AndOrBadge includeAntennas type="and" />;

    if (entriesLength > 1 && entryItemIndex === 0) {
      return (
        <MyFirstRowContainer grow={false} data-test-subj="entryItemFirstRowAndBadge">
          {badge}
        </MyFirstRowContainer>
      );
    } else if (entriesLength <= 1) {
      return (
        <MyInvisibleAndBadge grow={false} data-test-subj="entryItemInvisibleAndBadge">
          {badge}
        </MyInvisibleAndBadge>
      );
    } else {
      return (
        <EuiFlexItem grow={false} data-test-subj="entryItemAndBadge">
          {badge}
        </EuiFlexItem>
      );
    }
  }
);

AndBadgeRowComponent.displayName = 'AndBadgeRow';
