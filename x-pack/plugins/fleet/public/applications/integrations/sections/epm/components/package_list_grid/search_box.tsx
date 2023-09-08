/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';

import { EuiFieldSearch, EuiText, useEuiTheme, EuiIcon, EuiScreenReaderOnly } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type {
  ExtendedIntegrationCategory,
  CategoryFacet,
} from '../../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

export interface Props {
  searchTerm: string;
  setSearchTerm: (search: string) => void;
  selectedCategory: ExtendedIntegrationCategory;
  setCategory: (category: ExtendedIntegrationCategory) => void;
  categories: CategoryFacet[];
  availableSubCategories?: CategoryFacet[];
  setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
  selectedSubCategory?: string;
  setSelectedSubCategory?: (c: string | undefined) => void;
}

export const SearchBox: FunctionComponent<Props> = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setCategory,
  categories,
  availableSubCategories,
  setSelectedSubCategory,
  selectedSubCategory,
  setUrlandReplaceHistory,
}) => {
  const { euiTheme } = useEuiTheme();

  const onQueryChange = (e: any) => {
    const queryText = e.target.value;
    setSearchTerm(queryText);
    setUrlandReplaceHistory({
      searchString: queryText,
      categoryId: selectedCategory,
      subCategoryId: selectedSubCategory,
    });
  };

  const onCategoryButtonClick = () => {
    if (selectedSubCategory) {
      if (setSelectedSubCategory) setSelectedSubCategory(undefined);
      setUrlandReplaceHistory({
        categoryId: selectedCategory,
        subCategoryId: '',
      });
    } else {
      setCategory('');
      if (setSelectedSubCategory) setSelectedSubCategory(undefined);
      setUrlandReplaceHistory({
        searchString: '',
        categoryId: '',
        subCategoryId: '',
      });
    }
  };

  const selectedCategoryTitle = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.title
    : undefined;

  const getCategoriesLabel = useMemo(() => {
    const selectedSubCategoryTitle =
      selectedSubCategory && availableSubCategories
        ? availableSubCategories.find((subCat) => subCat.id === selectedSubCategory)?.title
        : undefined;

    if (selectedCategoryTitle && selectedSubCategoryTitle) {
      return `${selectedCategoryTitle}, ${selectedSubCategoryTitle}`;
    } else if (selectedCategoryTitle) {
      return `${selectedCategoryTitle}`;
    } else return '';
  }, [availableSubCategories, selectedCategoryTitle, selectedSubCategory]);

  return (
    <EuiFieldSearch
      data-test-subj="epmList.searchBar"
      placeholder={i18n.translate('xpack.fleet.epmList.searchPackagesPlaceholder', {
        defaultMessage: 'Search for integrations',
      })}
      value={searchTerm}
      onChange={(e) => onQueryChange(e)}
      isClearable={true}
      incremental={true}
      fullWidth={true}
      prepend={
        selectedCategoryTitle ? (
          <EuiText
            data-test-subj="epmList.categoryBadge"
            size="xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              fontWeight: euiTheme.font.weight.bold,
              backgroundColor: euiTheme.colors.lightestShade,
            }}
          >
            <EuiScreenReaderOnly>
              <span>Searching category: </span>
            </EuiScreenReaderOnly>
            {getCategoriesLabel}
            <button
              data-test-subj="epmList.categoryBadge.closeBtn"
              onClick={onCategoryButtonClick}
              aria-label="Remove filter"
              style={{
                padding: euiTheme.size.xs,
                paddingTop: '2px',
              }}
            >
              <EuiIcon
                type="cross"
                color="text"
                size="s"
                style={{
                  width: 'auto',
                  padding: 0,
                  backgroundColor: euiTheme.colors.lightestShade,
                }}
              />
            </button>
          </EuiText>
        ) : undefined
      }
    />
  );
};
