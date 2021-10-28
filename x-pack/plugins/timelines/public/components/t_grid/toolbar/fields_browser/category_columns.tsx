/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useDeepEqualSelector } from '../../../../hooks/use_selector';
import {
  LoadingSpinner,
  getCategoryPaneCategoryClassName,
  getFieldCount,
  VIEW_ALL_BUTTON_CLASS_NAME,
  CountBadge,
} from './helpers';
import * as i18n from './translations';
import { tGridSelectors } from '../../../../store/t_grid';
import { getColumnsWithTimestamp } from '../../../utils/helpers';
import type { OnUpdateColumns, BrowserFields } from '../../../../../common';

const CategoryName = styled.span<{ bold: boolean }>`
  .euiText {
    font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
  }
`;

CategoryName.displayName = 'CategoryName';

const LinkContainer = styled.div`
  width: 100%;
  .euiLink {
    width: 100%;
  }
`;

LinkContainer.displayName = 'LinkContainer';

const ViewAll = styled(EuiButtonIcon)`
  margin-left: 2px;
`;

ViewAll.displayName = 'ViewAll';

export interface CategoryItem {
  categoryId: string;
}

interface ViewAllButtonProps {
  categoryId: string;
  browserFields: BrowserFields;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
}

export const ViewAllButton = React.memo<ViewAllButtonProps>(
  ({ categoryId, browserFields, onUpdateColumns, timelineId }) => {
    const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
    const { isLoading } = useDeepEqualSelector((state) =>
      getManageTimeline(state, timelineId ?? '')
    );

    const handleClick = useCallback(() => {
      onUpdateColumns(
        getColumnsWithTimestamp({
          browserFields,
          category: categoryId,
        })
      );
    }, [browserFields, categoryId, onUpdateColumns]);

    return (
      <EuiToolTip content={i18n.VIEW_ALL_CATEGORY_FIELDS(categoryId)}>
        {!isLoading ? (
          <ViewAll
            aria-label={i18n.VIEW_ALL_CATEGORY_FIELDS(categoryId)}
            className={VIEW_ALL_BUTTON_CLASS_NAME}
            onClick={handleClick}
            iconType="visTable"
          />
        ) : (
          <LoadingSpinner size="m" />
        )}
      </EuiToolTip>
    );
  }
);

ViewAllButton.displayName = 'ViewAllButton';

/**
 * Returns the column definition for the (single) column that displays all the
 * category names in the field browser */
export const getCategoryColumns = ({
  filteredBrowserFields,
  onCategorySelected,
  selectedCategoryId,
  timelineId,
}: {
  filteredBrowserFields: BrowserFields;
  onCategorySelected: (categoryId: string) => void;
  selectedCategoryId: string;
  timelineId: string;
}) => [
  {
    field: 'categoryId',
    name: '',
    sortable: true,
    truncateText: false,
    render: (
      categoryId: string,
      { ariaRowindex }: { categoryId: string; ariaRowindex: number }
    ) => (
      <LinkContainer>
        <EuiLink
          aria-label={i18n.CATEGORY_LINK({
            category: categoryId,
            totalCount: getFieldCount(filteredBrowserFields[categoryId]),
          })}
          className={getCategoryPaneCategoryClassName({
            categoryId,
            timelineId,
          })}
          data-test-subj="category-link"
          data-colindex={1}
          data-rowindex={ariaRowindex}
          onClick={() => onCategorySelected(categoryId)}
        >
          <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <CategoryName data-test-subj="categoryName" bold={categoryId === selectedCategoryId}>
                <EuiText size="xs">{categoryId}</EuiText>
              </CategoryName>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <CountBadge data-test-subj={`${categoryId}-category-count`} color="hollow">
                {getFieldCount(filteredBrowserFields[categoryId])}
              </CountBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </LinkContainer>
    ),
  },
];
