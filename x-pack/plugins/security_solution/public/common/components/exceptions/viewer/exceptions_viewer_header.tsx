/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiFilterGroup,
  EuiFilterButton,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from '../translations';
import { Filter } from '../types';

interface ExceptionsViewerHeaderProps {
  isInitLoading: boolean;
  supportedListTypes: ExceptionListTypeEnum[];
  detectionsListItems: number;
  endpointListItems: number;
  onFilterChange: (arg: Partial<Filter>) => void;
  onAddExceptionClick: (type: ExceptionListTypeEnum) => void;
}

/**
 * Collection of filters and toggles for filtering exception items.
 */
const ExceptionsViewerHeaderComponent = ({
  isInitLoading,
  supportedListTypes,
  detectionsListItems,
  endpointListItems,
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

  const onAddExceptionDropdownClick = useCallback(
    (): void => setAddExceptionMenuOpen(!isAddExceptionMenuOpen),
    [setAddExceptionMenuOpen, isAddExceptionMenuOpen]
  );

  const handleDetectionsListClick = useCallback((): void => {
    setShowDetectionsList(!showDetectionsListsOnly);
    setShowEndpointList(false);
  }, [showDetectionsListsOnly, setShowDetectionsList, setShowEndpointList]);

  const handleEndpointListClick = useCallback((): void => {
    setShowEndpointList(!showEndpointListsOnly);
    setShowDetectionsList(false);
  }, [showEndpointListsOnly, setShowEndpointList, setShowDetectionsList]);

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

  const addExceptionButtonOptions = useMemo(
    (): EuiContextMenuPanelDescriptor[] => [
      {
        id: 0,
        items: [
          {
            name: i18n.ADD_TO_ENDPOINT_LIST,
            onClick: () => onAddException(ExceptionListTypeEnum.ENDPOINT),
            'data-test-subj': 'addEndpointExceptionBtn',
          },
          {
            name: i18n.ADD_TO_DETECTIONS_LIST,
            onClick: () => onAddException(ExceptionListTypeEnum.DETECTION),
            'data-test-subj': 'addDetectionsExceptionBtn',
          },
        ],
      },
    ],
    [onAddException]
  );

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

      {supportedListTypes.length === 1 && (
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="exceptionsHeaderAddExceptionBtn"
            onClick={() => onAddException(supportedListTypes[0])}
            isDisabled={isInitLoading}
            fill
          >
            {i18n.ADD_EXCEPTION_LABEL}
          </EuiButton>
        </EuiFlexItem>
      )}

      {supportedListTypes.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFilterGroup data-test-subj="exceptionsFilterGroupBtns">
                <EuiFilterButton
                  data-test-subj="exceptionsDetectionFilterBtn"
                  hasActiveFilters={showDetectionsListsOnly}
                  onClick={handleDetectionsListClick}
                  isDisabled={isInitLoading}
                >
                  {i18n.DETECTION_LIST}
                  {detectionsListItems != null ? ` (${detectionsListItems})` : ''}
                </EuiFilterButton>
                <EuiFilterButton
                  data-test-subj="exceptionsEndpointFilterBtn"
                  hasActiveFilters={showEndpointListsOnly}
                  onClick={handleEndpointListClick}
                  isDisabled={isInitLoading}
                >
                  {i18n.ENDPOINT_LIST}
                  {endpointListItems != null ? ` (${endpointListItems})` : ''}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButton
                    data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"
                    onClick={onAddExceptionDropdownClick}
                    isDisabled={isInitLoading}
                    iconType="arrowDown"
                    iconSide="right"
                    fill
                  >
                    {i18n.ADD_EXCEPTION_LABEL}
                  </EuiButton>
                }
                isOpen={isAddExceptionMenuOpen}
                closePopover={onAddExceptionDropdownClick}
                anchorPosition="downCenter"
                panelPaddingSize="none"
                repositionOnScroll
              >
                <EuiContextMenu initialPanelId={0} panels={addExceptionButtonOptions} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ExceptionsViewerHeaderComponent.displayName = 'ExceptionsViewerHeaderComponent';

export const ExceptionsViewerHeader = React.memo(ExceptionsViewerHeaderComponent);

ExceptionsViewerHeader.displayName = 'ExceptionsViewerHeader';
