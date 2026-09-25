/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { debounce } from 'lodash';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

interface Props {
  placeholder: string;
  searchQuery: string;
  isLoading?: boolean;
  onChangeSearchQuery: (value: string) => void;
  techPreview?: boolean;
  /**
   * Override the data-test-subj on the search input. Defaults to 'tableSearchInput'.
   * Pass a different value when two instances of TableSearchBar appear on the same
   * page to avoid Playwright strict-mode violations on the shared default subject.
   */
  dataTestSubj?: string;
}

export function TableSearchBar({
  placeholder,
  searchQuery,
  onChangeSearchQuery,
  isLoading,
  techPreview = false,
  dataTestSubj,
}: Props) {
  const debouncedSearchQuery = useMemo(
    () => debounce(onChangeSearchQuery, 500),
    [onChangeSearchQuery]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      {techPreview ? (
        <EuiFlexItem
          grow={false}
          css={css`
            justify-content: center;
          `}
        >
          <TechnicalPreviewBadge icon="flask" />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj={dataTestSubj ?? 'tableSearchInput'}
          placeholder={placeholder}
          fullWidth={true}
          defaultValue={searchQuery}
          compressed
          isLoading={isLoading}
          onChange={(e) => {
            debouncedSearchQuery(e.target.value);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function getItemsFilteredBySearchQuery<T, P extends keyof T>({
  items,
  fieldsToSearch,
  searchQuery,
}: {
  items: T[];
  fieldsToSearch: P[];
  searchQuery: string;
}) {
  const query = searchQuery.toLowerCase();
  return items.filter((item) => {
    return fieldsToSearch.some((field) => {
      const fieldValue = item[field] as unknown as string | undefined;
      return fieldValue?.toLowerCase().includes(query);
    });
  });
}
