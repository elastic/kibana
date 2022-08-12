/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from '../translations';
import type { Filter } from '../types';

interface ExceptionsViewerHeaderProps {
  isInitLoading: boolean;
  listType: ExceptionListTypeEnum;
  onFilterChange: (arg: Partial<Filter>) => void;
  onAddExceptionClick: (type: ExceptionListTypeEnum) => void;
}

/**
 * Collection of filters and toggles for filtering exception items.
 */
const ExceptionsViewerHeaderComponent = ({
  isInitLoading,
  listType,
  onFilterChange,
  onAddExceptionClick,
}: ExceptionsViewerHeaderProps): JSX.Element => {
  const [filter, setFilter] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect((): void => {
    onFilterChange({
      filter: { filter, tags },
      pagination: {
        pageIndex: 0,
      },
      showDetectionsListsOnly: listType !== ExceptionListTypeEnum.ENDPOINT,
      showEndpointListsOnly: listType === ExceptionListTypeEnum.ENDPOINT,
    });
  }, [filter, tags, onFilterChange, listType]);

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

  const handleAddException = useCallback(() => {
    onAddExceptionClick(listType);
  }, [onAddExceptionClick, listType]);

  const addExceptionButtonText = useMemo(() => {
    return listType === ExceptionListTypeEnum.ENDPOINT
      ? i18n.ADD_TO_ENDPOINT_LIST
      : i18n.ADD_TO_DETECTIONS_LIST;
  }, [listType]);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          data-test-subj="exceptionsHeaderSearch"
          aria-label={i18n.SEARCH_DEFAULT}
          placeholder={i18n.SEARCH_DEFAULT}
          onSearch={handleOnSearch}
          disabled={isInitLoading}
          incremental={false}
          fullWidth
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="exceptionsHeaderAddExceptionBtn"
          onClick={handleAddException}
          isDisabled={isInitLoading}
          fill
        >
          {addExceptionButtonText}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsViewerHeaderComponent.displayName = 'ExceptionsViewerHeaderComponent';

export const ExceptionsViewerHeader = React.memo(ExceptionsViewerHeaderComponent);

ExceptionsViewerHeader.displayName = 'ExceptionsViewerHeader';
