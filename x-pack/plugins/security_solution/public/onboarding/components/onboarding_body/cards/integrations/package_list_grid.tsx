/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';

import { css } from '@emotion/react';
import { PackageList } from './utils';
import { useIntegrationCardList, useTabMetaData } from './hooks';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../onboarding_context';
import {
  DEFAULT_TAB,
  INTEGRATION_TABS,
  LOADING_SKELETON_HEIGHT,
  SCROLL_ELEMENT_ID,
  SEARCH_FILTER_CATEGORIES,
  WITHOUT_SEARCH_BOX_HEIGHT,
  WITH_SEARCH_BOX_HEIGHT,
} from './const';

interface WrapperProps {
  useAvailablePackages: AvailablePackagesHookType;
}

const emptyStateStyles = { paddingTop: '16px' };
export const PackageListGrid = React.memo(({ useAvailablePackages }: WrapperProps) => {
  const { spaceId } = useOnboardingContext();
  const scrollElement = useRef<HTMLDivElement>(null);
  const [selectedTabId, setSelectedTabIdToStorage] = useStoredIntegrationTabId(
    spaceId,
    DEFAULT_TAB.id
  );
  const [searchTermFromStorage, setSearchTermToStorage] = useStoredIntegrationSearchTerm(spaceId);
  const [toggleIdSelected, setToggleIdSelected] = useState<string>(selectedTabId);
  const onTabChange = useCallback(
    (id: string) => {
      scrollElement.current?.scrollTo(0, 0);
      setToggleIdSelected(id);
      setSelectedTabIdToStorage(id);
    },
    [setToggleIdSelected, setSelectedTabIdToStorage]
  );

  const {
    filteredCards,
    isLoading,
    searchTerm,
    setCategory,
    setSearchTerm,
    setSelectedSubCategory,
  } = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });

  const { showSearchTools, customCardNames, selectedCategory, selectedSubCategory, overflow } =
    useTabMetaData(toggleIdSelected);

  const onSearchTermChanged = useCallback(
    (searchQuery: string) => {
      setSearchTerm(searchQuery);
      setSearchTermToStorage(searchQuery);
    },
    [setSearchTerm, setSearchTermToStorage]
  );

  useEffect(() => {
    setCategory(selectedCategory);
    setSelectedSubCategory(selectedSubCategory);
    if (!showSearchTools) {
      // If search box are not shown, clear the search term to avoid unexpected filtering
      onSearchTermChanged('');
    }
  }, [
    onSearchTermChanged,
    searchTermFromStorage,
    selectedCategory,
    selectedSubCategory,
    setCategory,
    setSearchTerm,
    setSelectedSubCategory,
    showSearchTools,
    toggleIdSelected,
  ]);

  const list: IntegrationCardItem[] = useIntegrationCardList({
    integrationsList: filteredCards,
    customCardNames,
  });

  if (isLoading) {
    return <EuiSkeletonText isLoading={true} lines={LOADING_SKELETON_HEIGHT} />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      className="step-paragraph"
      gutterSize={showSearchTools ? 'm' : 'none'}
      css={css`
        height: ${showSearchTools ? WITH_SEARCH_BOX_HEIGHT : WITHOUT_SEARCH_BOX_HEIGHT};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          buttonSize="compressed"
          color="primary"
          idSelected={toggleIdSelected}
          isFullWidth
          legend="Categories"
          onChange={onTabChange}
          options={INTEGRATION_TABS}
          type="single"
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          overflow-y: ${overflow};
        `}
        grow={1}
        id={SCROLL_ELEMENT_ID}
        ref={scrollElement}
      >
        <Suspense fallback={<EuiSkeletonText isLoading={true} lines={LOADING_SKELETON_HEIGHT} />}>
          <PackageList
            categories={SEARCH_FILTER_CATEGORIES} // We do not want to show categories and subcategories as the search bar filter
            emptyStateStyles={emptyStateStyles}
            list={list}
            scrollElementId={SCROLL_ELEMENT_ID}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            setCategory={setCategory}
            setSearchTerm={onSearchTermChanged}
            setUrlandPushHistory={noop}
            setUrlandReplaceHistory={noop}
            showCardLabels={false}
            showControls={false}
            showSearchTools={showSearchTools}
            spacer={false}
          />
        </Suspense>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PackageListGrid.displayName = 'PackageListGrid';
