/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../common/containers/source';
import { getColumnsWithTimestamp } from '../../../common/components/event_details/helpers';
import { CountBadge } from '../../../common/components/page';
import { OnUpdateColumns } from '../timeline/events';
import { WithHoverActions } from '../../../common/components/with_hover_actions';
import { LoadingSpinner, getCategoryPaneCategoryClassName, getFieldCount } from './helpers';
import * as i18n from './translations';
import { useManageTimeline } from '../manage_timeline';

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

export interface CategoryItem {
  categoryId: string;
}

interface ToolTipProps {
  categoryId: string;
  browserFields: BrowserFields;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
}

const ToolTip = React.memo<ToolTipProps>(
  ({ categoryId, browserFields, onUpdateColumns, timelineId }) => {
    const { getManageTimelineById } = useManageTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { isLoading } = useMemo(() => getManageTimelineById(timelineId) ?? { isLoading: false }, [
      timelineId,
    ]);
    return (
      <EuiToolTip content={i18n.VIEW_CATEGORY(categoryId)}>
        {!isLoading ? (
          <EuiIcon
            aria-label={i18n.VIEW_CATEGORY(categoryId)}
            color="text"
            onClick={() => {
              onUpdateColumns(
                getColumnsWithTimestamp({
                  browserFields,
                  category: categoryId,
                })
              );
            }}
            type="visTable"
          />
        ) : (
          <LoadingSpinner size="m" />
        )}
      </EuiToolTip>
    );
  }
);

ToolTip.displayName = 'ToolTip';

/**
 * Returns the column definition for the (single) column that displays all the
 * category names in the field browser */
export const getCategoryColumns = ({
  browserFields,
  filteredBrowserFields,
  onCategorySelected,
  onUpdateColumns,
  selectedCategoryId,
  timelineId,
}: {
  browserFields: BrowserFields;
  filteredBrowserFields: BrowserFields;
  onCategorySelected: (categoryId: string) => void;
  onUpdateColumns: OnUpdateColumns;
  selectedCategoryId: string;
  timelineId: string;
}) => [
  {
    field: 'categoryId',
    name: '',
    sortable: true,
    truncateText: false,
    render: (categoryId: string, _: { categoryId: string }) => (
      <LinkContainer>
        <EuiLink data-test-subj="category-link" onClick={() => onCategorySelected(categoryId)}>
          <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <WithHoverActions
                hoverContent={
                  <ToolTip
                    categoryId={categoryId}
                    browserFields={browserFields}
                    onUpdateColumns={onUpdateColumns}
                    timelineId={timelineId}
                  />
                }
                render={() => (
                  <CategoryName
                    bold={categoryId === selectedCategoryId}
                    className={getCategoryPaneCategoryClassName({
                      categoryId,
                      timelineId,
                    })}
                  >
                    <EuiText size="xs">{categoryId}</EuiText>
                  </CategoryName>
                )}
              />
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
