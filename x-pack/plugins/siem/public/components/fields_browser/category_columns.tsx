/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { getColumnsWithTimestamp } from '../event_details/helpers';
import { OnUpdateColumns } from '../timeline/events';
import { WithHoverActions } from '../with_hover_actions';

import * as i18n from './translations';
import { CountBadge } from '../page';
import { LoadingSpinner, getCategoryPaneCategoryClassName, getFieldCount } from './helpers';

const CategoryName = styled.span<{ bold: boolean }>`
  font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
`;

const HoverActionsContainer = styled(EuiPanel)`
  cursor: default;
  height: 25px;
  left: 5px;
  position: absolute;
  top: -5px;
  width: 30px;
`;

const HoverActionsFlexGroup = styled(EuiFlexGroup)`
  cursor: pointer;
  left: -2px;
  position: relative;
  top: -6px;
`;

const LinkContainer = styled.div`
  width: 100%;
  .euiLink {
    width: 100%;
  }
`;

export interface CategoryItem {
  categoryId: string;
}

/**
 * Returns the column definition for the (single) column that displays all the
 * category names in the field browser */
export const getCategoryColumns = ({
  browserFields,
  filteredBrowserFields,
  isLoading,
  onCategorySelected,
  onUpdateColumns,
  selectedCategoryId,
  timelineId,
}: {
  browserFields: BrowserFields;
  filteredBrowserFields: BrowserFields;
  isLoading: boolean;
  onCategorySelected: (categoryId: string) => void;
  onUpdateColumns: OnUpdateColumns;
  selectedCategoryId: string;
  timelineId: string;
}) => [
  {
    field: 'categoryId',
    sortable: true,
    truncateText: false,
    render: (categoryId: string) => (
      <LinkContainer>
        <EuiLink data-test-subj="category-link" onClick={() => onCategorySelected(categoryId)}>
          <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <WithHoverActions
                hoverContent={
                  <HoverActionsContainer data-test-subj="hover-actions-container" paddingSize="s">
                    <HoverActionsFlexGroup
                      alignItems="center"
                      direction="row"
                      gutterSize="none"
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem grow={false}>
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
                      </EuiFlexItem>
                    </HoverActionsFlexGroup>
                  </HoverActionsContainer>
                }
                render={() => (
                  <CategoryName
                    bold={categoryId === selectedCategoryId}
                    className={getCategoryPaneCategoryClassName({
                      categoryId,
                      timelineId,
                    })}
                  >
                    {categoryId}
                  </CategoryName>
                )}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <CountBadge color="hollow">
                {getFieldCount(filteredBrowserFields[categoryId])}
              </CountBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </LinkContainer>
    ),
  },
];
