/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSearchBar } from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from '../../utils/translations';
import type { GetExceptionItemProps } from '.';

const ITEMS_SCHEMA = {
  strict: true,
  fields: {
    created_by: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    id: {
      type: 'string',
    },
    item_id: {
      type: 'string',
    },
    list_id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    os_types: {
      type: 'string',
    },
    tags: {
      type: 'string',
    },
  },
};

interface ExceptionsViewerSearchBarProps {
  canAddException: boolean;
  // Exception list type used to determine what type of item is
  // being created when "onAddExceptionClick" is invoked
  listType: ExceptionListTypeEnum;
  isSearching: boolean;
  onSearch: (arg: GetExceptionItemProps) => void;
  onAddExceptionClick: (type: ExceptionListTypeEnum) => void;
}

/**
 * Search exception items and take actions (to creat an item)
 */
const ExceptionsViewerSearchBarComponent = ({
  canAddException,
  listType,
  isSearching,
  onSearch,
  onAddExceptionClick,
}: ExceptionsViewerSearchBarProps): JSX.Element => {
  const handleOnSearch = useCallback(
    ({ queryText }): void => {
      onSearch({ search: queryText });
    },
    [onSearch]
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
        <EuiSearchBar
          box={{
            placeholder: 'Search on the fields below: e.g. name:"my list"',
            incremental: false,
            schema: ITEMS_SCHEMA,
            'data-test-subj': 'exceptionsViewerSearchBar',
          }}
          filters={[]}
          onChange={handleOnSearch}
        />
      </EuiFlexItem>
      {!canAddException && (
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="exceptionsHeaderAddExceptionBtn"
            onClick={handleAddException}
            isDisabled={isSearching}
            fill
          >
            {addExceptionButtonText}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ExceptionsViewerSearchBarComponent.displayName = 'ExceptionsViewerSearchBarComponent';

export const ExceptionsViewerSearchBar = React.memo(ExceptionsViewerSearchBarComponent);

ExceptionsViewerSearchBar.displayName = 'ExceptionsViewerSearchBar';
