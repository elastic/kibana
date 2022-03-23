/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { omit } from 'lodash';
import {
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  FilterChecked,
} from '@elastic/eui';
import { BrowserFields } from '../../../../../common';
import * as i18n from './translations';
import { getFieldCount } from './helpers';
import { isEscape } from '../../../../../common/utils/accessibility';

interface CategoriesSelectorProps {
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  /** The category selected on the left-hand side of the field browser */
  selectedCategoryIds: string[];
}

interface CategoryOption {
  label: string;
  count: number;
  checked?: FilterChecked;
}

const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';

const CategoryName = styled.span<{ bold: boolean }>`
  font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
`;
CategoryName.displayName = 'CategoryName';

const CategorySelectableContainer = styled.div`
  width: 300px;
`;
CategorySelectableContainer.displayName = 'CategorySelectableContainer';

const renderOption = (option: CategoryOption, searchValue: string) => {
  const { label, count, checked } = option;
  // Some category names have spaces, but test selectors don't like spaces,
  // Tests are not able to find subjects with spaces, so we need to clean them.
  const idAttr = label.replace(/\s/g, '');
  return (
    <EuiFlexGroup
      data-test-subj={`categories-selector-option-${idAttr}`}
      alignItems="center"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <CategoryName
          data-test-subj={`categories-selector-option-name-${idAttr}`}
          bold={checked === 'on'}
        >
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        </CategoryName>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CountBadge>{count}</CountBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CategoriesSelectorComponent: React.FC<CategoriesSelectorProps> = ({
  filteredBrowserFields,
  setSelectedCategoryIds,
  selectedCategoryIds,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const totalCategories = useMemo(
    () => Object.keys(filteredBrowserFields).length,
    [filteredBrowserFields]
  );

  const categoryOptions: CategoryOption[] = useMemo(() => {
    const unselectedCategoryIds = Object.keys(
      omit(filteredBrowserFields, selectedCategoryIds)
    ).sort();
    return [
      ...selectedCategoryIds.map((categoryId) => ({
        label: categoryId,
        count: getFieldCount(filteredBrowserFields[categoryId]),
        checked: 'on',
      })),
      ...unselectedCategoryIds.map((categoryId) => ({
        label: categoryId,
        count: getFieldCount(filteredBrowserFields[categoryId]),
      })),
    ];
  }, [selectedCategoryIds, filteredBrowserFields]);

  const onCategoriesChange = useCallback(
    (options: CategoryOption[]) => {
      setSelectedCategoryIds(
        options.filter(({ checked }) => checked === 'on').map(({ label }) => label)
      );
    },
    [setSelectedCategoryIds]
  );

  const onKeyDown = useCallback((keyboardEvent: React.KeyboardEvent) => {
    if (isEscape(keyboardEvent)) {
      // Prevent escape to close the field browser modal after closing the category selector
      keyboardEvent.stopPropagation();
    }
  }, []);

  return (
    <EuiFilterGroup data-test-subj="categories-selector">
      <EuiPopover
        button={
          <EuiFilterButton
            data-test-subj="categories-filter-button"
            hasActiveFilters={selectedCategoryIds.length > 0}
            iconType="arrowDown"
            isSelected={isPopoverOpen}
            numActiveFilters={selectedCategoryIds.length}
            numFilters={totalCategories}
            onClick={togglePopover}
          >
            {i18n.CATEGORIES}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <CategorySelectableContainer
          onKeyDown={onKeyDown}
          data-test-subj="categories-selector-container"
        >
          <EuiSelectable
            aria-label="Searchable categories"
            searchable
            searchProps={{
              'data-test-subj': 'categories-selector-search',
            }}
            options={categoryOptions}
            renderOption={renderOption}
            onChange={onCategoriesChange}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </CategorySelectableContainer>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const CategoriesSelector = React.memo(CategoriesSelectorComponent);
