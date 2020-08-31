/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../common/containers/source';
import { getFieldBrowserCategoryTitleClassName, getFieldCount } from './helpers';
import { CountBadge } from '../../../common/components/page';

const CountBadgeContainer = styled.div`
  position: relative;
  top: -3px;
`;

CountBadgeContainer.displayName = 'CountBadgeContainer';

interface Props {
  /** The title of the category */
  categoryId: string;
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /** The timeline associated with this field browser */
  timelineId: string;
}

export const CategoryTitle = React.memo<Props>(
  ({ filteredBrowserFields, categoryId, timelineId }) => (
    <EuiFlexGroup alignItems="center" data-test-subj="category-title-container" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiTitle
          className={getFieldBrowserCategoryTitleClassName({ categoryId, timelineId })}
          data-test-subj="selected-category-title"
          size="xxs"
        >
          <h5>{categoryId}</h5>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CountBadgeContainer>
          <CountBadge data-test-subj="selected-category-count-badge" color="hollow">
            {getFieldCount(filteredBrowserFields[categoryId])}
          </CountBadge>
        </CountBadgeContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

CategoryTitle.displayName = 'CategoryTitle';
