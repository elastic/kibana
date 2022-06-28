/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ExceptionListSchema, ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSearchBar,
} from '@elastic/eui';

import * as i18n from './translations';
import { Filter } from '../types';

interface ExceptionsViewerHeaderProps {
  isInitLoading: boolean;
  exceptionListContainers: ExceptionListSchema[];
  onFilterChange: (arg: Partial<Filter>) => void;
  onAddExceptionClick: () => void;
}

/**
 * Collection of filters and toggles for filtering exception items.
 */
const ExceptionsViewerHeaderComponent = ({
  isInitLoading,
  exceptionListContainers,
  onFilterChange,
  onAddExceptionClick,
}: ExceptionsViewerHeaderProps): JSX.Element => {
  const [filter, setFilter] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [showDetectionsListsOnly, setShowDetectionsList] = useState(false);
  const [showEndpointListsOnly, setShowEndpointList] = useState(false);
  const [isAddExceptionMenuOpen, setAddExceptionMenuOpen] = useState(false);

  useEffect((): void => {
    onFilterChange({
      filter: { filter, tags },
      pagination: {
        pageIndex: 0,
      },
      showDetectionsListsOnly,
      showEndpointListsOnly,
    });
  }, [filter, tags, showDetectionsListsOnly, showEndpointListsOnly, onFilterChange]);

  const handleOnSearch = useCallback(
    (searchValue: string): void => {
      const tagsRegex = /(tags:[^\s]*)/i;
      const tagsMatch = searchValue.match(tagsRegex);
      const foundTags: string = tagsMatch != null ? tagsMatch[0].split(':')[1] : '';
      const filterString = tagsMatch != null ? searchValue.replace(tagsRegex, '') : searchValue;

      if (foundTags.length > 0) {
        setTags(foundTags.split(','));
      }

      setFilter(filterString.trim());
    },
    [setTags, setFilter]
  );

  const onAddException = useCallback(
    (type: ExceptionListTypeEnum): void => {
      onAddExceptionClick(type);
      setAddExceptionMenuOpen(false);
    },
    [onAddExceptionClick, setAddExceptionMenuOpen]
  );

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        <EuiSearchBar
          query={''}
          box={{
            placeholder: i18n.EXCEPTION_ITEMS_SEARCH_PLACEHOLDER,
            incremental: false,
          }}
          filters={[
            {
              type: 'field_value_selection',
              field: 'list_id',
              name: i18n.exceptionItemsListFilterLabel(exceptionListContainers.length),
              multiSelect: 'or',
              options: exceptionListContainers.map((list) => ({
                value: list.list_id,
                name: list.name,
              })),
            },
          ]}
          onChange={() => {}}
          data-test-subj="exceptionItemsSearchBar"
        />
      </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="exceptionsHeaderAddExceptionBtn"
            onClick={onAddException}
            isDisabled={isInitLoading}
            fill
          >
            {i18n.CREATE_RULE_EXCEPTION_BUTTON}
          </EuiButton>
        </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsViewerHeaderComponent.displayName = 'ExceptionsViewerHeaderComponent';

export const ExceptionsViewerHeader = React.memo(ExceptionsViewerHeaderComponent);

ExceptionsViewerHeader.displayName = 'ExceptionsViewerHeader';
