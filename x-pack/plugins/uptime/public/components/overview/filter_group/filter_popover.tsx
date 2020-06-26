/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch, EuiFilterSelectItem, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { UptimeFilterButton } from './uptime_filter_button';
import { LocationLink } from '../monitor_list';

export interface FilterPopoverProps {
  fieldName: string;
  id: string;
  loading: boolean;
  disabled?: boolean;
  items: string[];
  onFilterFieldChange: (fieldName: string, values: string[]) => void;
  selectedItems: string[];
  title: string;
  btnContent?: JSX.Element;
  forceOpen?: boolean;
  setForceOpen?: (val: boolean) => void;
}

const updateFiltersCallback = (
  fieldName: string,
  selectedItems: string[],
  newSelections: string[],
  deletions: string[],
  setNewSelections: (list: string[]) => void,
  setDeletions: (list: string[]) => void,
  onFilterFieldChange: (fieldName: string, values: string[]) => void
) => {
  const updatedSelections = [...selectedItems, ...newSelections].filter(
    (item) => !deletions.includes(item)
  );
  // compare the update list to the existing store before calling the API and re-rendering the UI
  if (JSON.stringify(updatedSelections.sort()) !== JSON.stringify(selectedItems.sort())) {
    onFilterFieldChange(fieldName, updatedSelections);
  }
  setNewSelections([]);
  setDeletions([]);
};

export const FilterPopover = ({
  fieldName,
  id,
  disabled,
  loading,
  items: allItems,
  onFilterFieldChange,
  selectedItems,
  title,
  btnContent,
  forceOpen,
  setForceOpen,
}: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * While the popover is open we store temporary lists of updates. If an item is
   * not selected in the store, we add/remove it from new selections. If it is
   * selected in the store, we add/remove it from a list of items to delete.
   *
   * In `updateFiltersCallback`, we compile a new list for the store, and clear
   * these temp items. If the new list doesn't match what's already in the store,
   * we update the store.
   */
  const [newSelections, setNewSelections] = useState<string[]>([]);
  const [deletions, setDeletions] = useState<string[]>([]);
  return (
    <EuiPopover
      button={
        btnContent ?? (
          <UptimeFilterButton
            isDisabled={disabled && selectedItems.length === 0}
            isSelected={selectedItems.length > 0}
            numFilters={allItems.length}
            numActiveFilters={selectedItems.length}
            onClick={() => {
              if (isOpen) {
                updateFiltersCallback(
                  fieldName,
                  selectedItems,
                  newSelections,
                  deletions,
                  setNewSelections,
                  setDeletions,
                  onFilterFieldChange
                );
              }
              setIsOpen(!isOpen);
            }}
            title={title}
          />
        )
      }
      closePopover={() => {
        setIsOpen(false);
        updateFiltersCallback(
          fieldName,
          selectedItems,
          newSelections,
          deletions,
          setNewSelections,
          setDeletions,
          onFilterFieldChange
        );
        if (setForceOpen) {
          setForceOpen(false);
        }
      }}
      data-test-subj={`filter-popover_${id}`}
      id={id}
      isOpen={isOpen || forceOpen}
      ownFocus={true}
      withTitle
      zIndex={10000}
    >
      <EuiPopoverTitle>
        <EuiFieldSearch
          incremental={true}
          disabled={allItems.length === 0}
          onSearch={(query) => setSearchQuery(query)}
          placeholder={
            loading
              ? i18n.translate('xpack.uptime.filterPopout.loadingMessage', {
                  defaultMessage: 'Loading...',
                })
              : i18n.translate('xpack.uptime.filterPopout.searchMessage', {
                  defaultMessage: 'Search {title}',
                  values: {
                    title,
                  },
                })
          }
        />
      </EuiPopoverTitle>
      {!loading &&
        (searchQuery ? allItems.filter((item) => item.includes(searchQuery)) : allItems).map(
          (item) => (
            <EuiFilterSelectItem
              checked={
                selectedItems.concat(newSelections).includes(item) && !deletions.includes(item)
                  ? 'on'
                  : undefined
              }
              data-test-subj={`filter-popover-item_${item}`}
              key={item}
              onClick={() => {
                // item not globally selected, or locally selected
                if (!newSelections.includes(item) && !selectedItems.includes(item)) {
                  setNewSelections([...newSelections, item]);
                  // item locally selected, deselect
                } else if (newSelections.includes(item)) {
                  setNewSelections(newSelections.filter((selection) => selection !== item));
                  // item globally selected, locally mark to delete
                } else if (selectedItems.includes(item) && !deletions.includes(item)) {
                  setDeletions([...deletions, item]);
                  // item locally marked for deletion, unmark
                } else if (deletions.includes(item)) {
                  setDeletions(deletions.filter((selection) => selection !== item));
                }
              }}
            >
              {item}
            </EuiFilterSelectItem>
          )
        )}
      {id === 'location' && allItems.length === 0 && <LocationLink />}
    </EuiPopover>
  );
};
