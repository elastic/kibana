/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiContextMenuPanelDescriptor,
  EuiButtonGroupOption,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';

import * as i18n from '../translations';
import { ToggleId } from '../types';

interface ExceptionsViewerHeaderProps {
  selectedListType: ToggleId;
  isInitLoading: boolean;
  listTypes: ToggleId[];
  onFiltersChange: ({ filter, tags }: { filter: string; tags: string[] }) => void;
  onAddExceptionClick: (type: ToggleId) => void;
  onToggleListType: (type: ToggleId) => void;
}

/**
 * Collection of filters and toggles for filtering exception items.
 */
const ExceptionsViewerHeaderComponent = ({
  selectedListType,
  isInitLoading,
  listTypes,
  onFiltersChange,
  onToggleListType,
  onAddExceptionClick,
}: ExceptionsViewerHeaderProps): JSX.Element => {
  const [isAddExceptionMenuOpen, setAddExceptionMenuOpen] = useState(false);

  const onToggle = useCallback(
    (id: string): void => {
      const toggle =
        id === ToggleId.DETECTION_ENGINE ? ToggleId.DETECTION_ENGINE : ToggleId.ENDPOINT;
      onToggleListType(toggle);
    },
    [onToggleListType]
  );

  const handleOnSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const searchValue = event.target.value;
      const tagsRegex = /(tags:[^\s]*)/i;
      const tagsMatch = searchValue.match(tagsRegex);
      const foundTags: string = tagsMatch != null ? tagsMatch[0].split(':')[1] : '';
      const filterString = tagsMatch != null ? searchValue.replace(tagsRegex, '') : searchValue;
      onFiltersChange({
        filter: filterString.trim(),
        tags: foundTags.length ? foundTags.split(',') : [],
      });
    },
    [onFiltersChange]
  );

  const onAddExceptionDropdownClick = useCallback(
    (): void => setAddExceptionMenuOpen(!isAddExceptionMenuOpen),
    [setAddExceptionMenuOpen]
  );

  const onAddException = useCallback(
    (type: ToggleId): void => {
      onAddExceptionClick(type);
      setAddExceptionMenuOpen(false);
    },
    [onAddExceptionClick, setAddExceptionMenuOpen]
  );

  const getAddExceptionOptions = useMemo(
    (): EuiContextMenuPanelDescriptor[] => [
      {
        id: 0,
        items: [
          {
            name: i18n.ADD_TO_ENDPOINT_LIST,
            onClick: () => {
              onAddException(ToggleId.ENDPOINT);
            },
            'data-test-subj': 'addEndpointExceptionBtn',
          },
          {
            name: i18n.ADD_TO_DETECTIONS_LIST,
            onClick: () => {
              onAddException(ToggleId.DETECTION_ENGINE);
            },
            'data-test-subj': 'addDetectionsExceptionBtn',
          },
        ],
      },
    ],
    [onAddException]
  );

  const toggleOptions = useMemo((): EuiButtonGroupOption[] => {
    return [
      {
        id: ToggleId.DETECTION_ENGINE,
        label: 'Detection Engine',
        isDisabled: !listTypes.includes(ToggleId.DETECTION_ENGINE),
        'data-test-subj': 'detectionsToggle',
      },
      {
        id: ToggleId.ENDPOINT,
        label: 'Endpoint',
        isDisabled: !listTypes.includes(ToggleId.ENDPOINT),
        'data-test-subj': 'endpointToggle',
      },
    ];
  }, [listTypes]);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          aria-label={i18n.SEARCH_DEFAULT}
          incremental={false}
          placeholder={i18n.SEARCH_DEFAULT}
          onChange={handleOnSearch}
          disabled={isInitLoading || listTypes.length === 0}
          fullWidth
          data-test-subj="exceptionsHeaderSearch"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={'Exception list type toggle'}
          options={toggleOptions}
          idSelected={selectedListType}
          onChange={onToggle}
          isDisabled={isInitLoading}
          data-test-subj="exceptionsHeaderListToggle"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPopover
          id="contextMenuNormal"
          button={
            <EuiButton
              iconType="arrowDown"
              iconSide="right"
              onClick={onAddExceptionDropdownClick}
              isDisabled={isInitLoading}
              fill
              data-test-subj="exceptionsHeaderAddExceptionBtn"
            >
              {i18n.ADD_EXCEPTION_LABEL}
            </EuiButton>
          }
          isOpen={isAddExceptionMenuOpen}
          closePopover={onAddExceptionDropdownClick}
          panelPaddingSize="none"
          withTitle
          anchorPosition="upLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={getAddExceptionOptions} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsViewerHeaderComponent.displayName = 'ExceptionsViewerHeaderComponent';

export const ExceptionsViewerHeader = React.memo(ExceptionsViewerHeaderComponent);

ExceptionsViewerHeader.displayName = 'ExceptionsViewerHeader';
