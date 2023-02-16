/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, FunctionComponent } from 'react';
import { useMemo } from 'react';
import React, { useCallback, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useLocalSearch, searchIdField } from '../../../../hooks';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import type {
  ExtendedIntegrationCategory,
  CategoryFacet,
} from '../../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

import { ExperimentalFeaturesService } from '../../../../services';

import { promoteFeaturedIntegrations } from '../utils';

import { ControlsColumn, MissingIntegrationContent, GridColumn } from './controls';
import { SearchBox } from './search_box';

export interface Props {
  isLoading?: boolean;
  controls?: ReactNode | ReactNode[];
  list: IntegrationCardItem[];
  searchTerm: string;
  setSearchTerm: (search: string) => void;
  selectedCategory: ExtendedIntegrationCategory;
  setCategory: (category: ExtendedIntegrationCategory) => void;
  categories: CategoryFacet[];
  setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
  callout?: JSX.Element | null;
  // Props used only in AvailablePackages component:
  showCardLabels?: boolean;
  title?: string;
  availableSubCategories?: CategoryFacet[];
  selectedSubCategory?: string;
  setSelectedSubCategory?: (c: string | undefined) => void;
  showMissingIntegrationMessage?: boolean;
}

export const PackageListGrid: FunctionComponent<Props> = ({
  isLoading,
  controls,
  title,
  list,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setCategory,
  categories,
  availableSubCategories,
  setSelectedSubCategory,
  selectedSubCategory,
  setUrlandReplaceHistory,
  setUrlandPushHistory,
  showMissingIntegrationMessage = false,
  callout,
  showCardLabels = true,
}) => {
  const localSearchRef = useLocalSearch(list);

  const [isPopoverOpen, setPopover] = useState(false);

  const MAX_SUBCATEGORIES_NUMBER = 6;

  const { showIntegrationsSubcategories } = ExperimentalFeaturesService.get();

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const resetQuery = () => {
    setSearchTerm('');
    setUrlandReplaceHistory({ searchString: '', categoryId: '', subCategoryId: '' });
  };

  const onSubCategoryClick = useCallback(
    (subCategory: string) => {
      if (setSelectedSubCategory) setSelectedSubCategory(subCategory);
      setUrlandPushHistory({
        categoryId: selectedCategory,
        subCategoryId: subCategory,
      });
    },
    [selectedCategory, setSelectedSubCategory, setUrlandPushHistory]
  );

  const filteredPromotedList = useMemo(() => {
    if (isLoading) return [];
    const filteredList = searchTerm
      ? list.filter((item) =>
          (localSearchRef.current!.search(searchTerm) as IntegrationCardItem[])
            .map((match) => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;

    return promoteFeaturedIntegrations(filteredList, selectedCategory);
  }, [isLoading, list, localSearchRef, searchTerm, selectedCategory]);

  const splitSubcategories = (
    subcategories: CategoryFacet[] | undefined
  ): { visibleSubCategories?: CategoryFacet[]; hiddenSubCategories?: CategoryFacet[] } => {
    if (!subcategories) return {};
    else if (subcategories && subcategories?.length < MAX_SUBCATEGORIES_NUMBER) {
      return { visibleSubCategories: subcategories, hiddenSubCategories: [] };
    } else if (subcategories && subcategories?.length >= MAX_SUBCATEGORIES_NUMBER) {
      return {
        visibleSubCategories: subcategories.slice(0, MAX_SUBCATEGORIES_NUMBER),
        hiddenSubCategories: subcategories.slice(MAX_SUBCATEGORIES_NUMBER),
      };
    }
    return {};
  };

  const splitSubcat = splitSubcategories(availableSubCategories);
  const { visibleSubCategories } = splitSubcat;
  const hiddenSubCategoriesItems = useMemo(() => {
    return splitSubcat?.hiddenSubCategories?.map((subCategory) => {
      return (
        <EuiContextMenuItem
          key={subCategory.id}
          onClick={() => {
            onSubCategoryClick(subCategory.id);
            closePopover();
          }}
          icon={selectedSubCategory === subCategory.id ? 'check' : 'empty'}
        >
          {subCategory.title}
        </EuiContextMenuItem>
      );
    });
  }, [onSubCategoryClick, selectedSubCategory, splitSubcat?.hiddenSubCategories]);

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="xl" data-test-subj="epmList.integrationCards">
      <EuiFlexItem
        data-test-subj="epmList.controlsSideColumn"
        grow={1}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <ControlsColumn controls={controls} title={title} />
      </EuiFlexItem>
      <EuiFlexItem grow={5} data-test-subj="epmList.mainColumn">
        <SearchBox
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setCategory={setCategory}
          categories={categories}
          availableSubCategories={availableSubCategories}
          setSelectedSubCategory={setSelectedSubCategory}
          selectedSubCategory={selectedSubCategory}
          setUrlandReplaceHistory={setUrlandReplaceHistory}
        />
        {showIntegrationsSubcategories && availableSubCategories?.length ? <EuiSpacer /> : null}
        {showIntegrationsSubcategories ? (
          <EuiFlexGroup
            data-test-subj="epmList.subcategoriesRow"
            justifyContent="flexStart"
            direction="row"
            gutterSize="s"
            style={{
              maxWidth: 943,
            }}
          >
            {visibleSubCategories?.map((subCategory) => {
              const isSelected = subCategory.id === selectedSubCategory;
              return (
                <EuiFlexItem grow={false} key={subCategory.id}>
                  <EuiButton
                    css={isSelected ? 'color: white' : ''}
                    color={isSelected ? 'accent' : 'text'}
                    fill={isSelected}
                    aria-label={subCategory?.title}
                    onClick={() => onSubCategoryClick(subCategory.id)}
                  >
                    <FormattedMessage
                      id="xpack.fleet.epmList.subcategoriesButton"
                      defaultMessage="{subcategory}"
                      values={{
                        subcategory: subCategory.title,
                      }}
                    />
                  </EuiButton>
                </EuiFlexItem>
              );
            })}
            {hiddenSubCategoriesItems?.length ? (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  data-test-subj="epmList.showMoreSubCategoriesButton"
                  id="moreSubCategories"
                  button={
                    <EuiButtonIcon
                      display="base"
                      onClick={onButtonClick}
                      iconType="boxesHorizontal"
                      aria-label="Show more subcategories"
                      size="m"
                    />
                  }
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel size="s" items={hiddenSubCategoriesItems} />
                </EuiPopover>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ) : null}
        {callout ? (
          <>
            <EuiSpacer />
            {callout}
          </>
        ) : null}
        <EuiSpacer />
        <GridColumn
          isLoading={isLoading || !localSearchRef.current}
          list={filteredPromotedList}
          showMissingIntegrationMessage={showMissingIntegrationMessage}
          showCardLabels={showCardLabels}
        />
        {showMissingIntegrationMessage && (
          <>
            <EuiSpacer />
            <MissingIntegrationContent
              setUrlandPushHistory={setUrlandPushHistory}
              resetQuery={resetQuery}
              setSelectedCategory={setCategory}
            />
            <EuiSpacer />
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
