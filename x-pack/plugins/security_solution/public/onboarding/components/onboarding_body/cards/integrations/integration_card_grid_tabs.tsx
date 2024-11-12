/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import {
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPortal,
  EuiSkeletonText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';

import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { withLazyHook } from '../../../../../common/components/with_lazy_hook';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../onboarding_context';
import {
  DEFAULT_TAB,
  LOADING_SKELETON_TEXT_LINES,
  SCROLL_ELEMENT_ID,
  SEARCH_FILTER_CATEGORIES,
  TELEMETRY_INTEGRATION_TAB,
  WITHOUT_SEARCH_BOX_HEIGHT,
  WITH_SEARCH_BOX_HEIGHT,
} from './constants';
import { INTEGRATION_TABS, INTEGRATION_TABS_BY_ID } from './integration_tabs_configs';
import { useIntegrationCardList } from './use_integration_card_list';
import { IntegrationTabId } from './types';
import { IntegrationCardTopCallout } from './callouts/integration_card_top_callout';
import { trackOnboardingLinkClick } from '../../../../common/lib/telemetry';

export interface IntegrationsCardGridTabsProps {
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
  useAvailablePackages: AvailablePackagesHookType;
}

const emptyStateStyles = { paddingTop: '16px' };

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

const Detail = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.Detail())
    .then((pkg) => pkg.Detail),
}));

const IntegrationsStateContextProvider = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.UseIntegrationsState())
    .then((pkg) => pkg.IntegrationsStateContextProvider),
}));

const PackageInstallProvider = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.UsePackageInstall())
    .then((pkg) => pkg.packageInstallContainer[0]),
}));

const FleetStatusProvider = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.FleetStatusProvider())
    .then((pkg) => pkg.FleetStatusProvider),
}));

const UIExtensionsContextProvider = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.UIExtensionsContextProvider())
    .then((pkg) => pkg.UIExtensionsContextProvider),
}));

export const IntegrationsCardGridTabsComponent = React.memo<IntegrationsCardGridTabsProps>(
  ({ installedIntegrationsCount, isAgentRequired, useAvailablePackages }) => {
    const { spaceId } = useOnboardingContext();
    const startServices = useKibana().services;
    const { state: routerState } = useLocation();
    const scrollElement = useRef<HTMLDivElement>(null);
    const [toggleIdSelected, setSelectedTabIdToStorage] = useStoredIntegrationTabId(
      spaceId,
      DEFAULT_TAB.id
    );
    const [searchTermFromStorage, setSearchTermToStorage] = useStoredIntegrationSearchTerm(spaceId);
    const onTabChange = useCallback(
      (stringId: string) => {
        const id = stringId as IntegrationTabId;
        const trackId = `${TELEMETRY_INTEGRATION_TAB}_${id}`;
        scrollElement.current?.scrollTo?.(0, 0);
        setSelectedTabIdToStorage(id);
        trackOnboardingLinkClick(trackId);
      },
      [setSelectedTabIdToStorage]
    );

    const [isModalVisible, setIsModalVisible] = useState(false);

    const closeModal = () => setIsModalVisible(false);
    const showModal = () => setIsModalVisible(true);
    const modalTitleId = useGeneratedHtmlId();
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

    const selectedTab = useMemo(() => INTEGRATION_TABS_BY_ID[toggleIdSelected], [toggleIdSelected]);

    const onSearchTermChanged = useCallback(
      (searchQuery: string) => {
        setSearchTerm(searchQuery);
        // Search term is preserved across VISIBLE tabs
        // As we want user to be able to see the same search results when coming back from Fleet
        if (selectedTab.showSearchTools) {
          setSearchTermToStorage(searchQuery);
        }
      },
      [selectedTab.showSearchTools, setSearchTerm, setSearchTermToStorage]
    );

    useEffect(() => {
      setCategory(selectedTab.category ?? '');
      setSelectedSubCategory(selectedTab.subCategory);
      if (!selectedTab.showSearchTools) {
        // If search box are not shown, clear the search term to avoid unexpected filtering
        onSearchTermChanged('');
      }

      if (
        selectedTab.showSearchTools &&
        searchTermFromStorage &&
        toggleIdSelected !== IntegrationTabId.recommended
      ) {
        setSearchTerm(searchTermFromStorage);
      }
    }, [
      onSearchTermChanged,
      searchTermFromStorage,
      selectedTab.category,
      selectedTab.showSearchTools,
      selectedTab.subCategory,
      setCategory,
      setSearchTerm,
      setSelectedSubCategory,
      toggleIdSelected,
    ]);
    console.log('routerState---', routerState);
    const list: IntegrationCardItem[] = useIntegrationCardList({
      integrationsList: filteredCards,
      featuredCardIds: selectedTab.featuredCardIds,
      onCardClicked: showModal,
    });

    if (isLoading) {
      return (
        <EuiSkeletonText
          data-test-subj="loadingPackages"
          isLoading={true}
          lines={LOADING_SKELETON_TEXT_LINES}
        />
      );
    }
    return (
      <>
        <EuiFlexGroup
          direction="column"
          className="step-paragraph"
          gutterSize={selectedTab.showSearchTools ? 'm' : 'none'}
          css={css`
            height: ${selectedTab.showSearchTools
              ? WITH_SEARCH_BOX_HEIGHT
              : WITHOUT_SEARCH_BOX_HEIGHT};
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
              overflow-y: ${selectedTab.overflow ?? 'auto'};
            `}
            grow={1}
            id={SCROLL_ELEMENT_ID}
            ref={scrollElement}
          >
            <Suspense
              fallback={<EuiSkeletonText isLoading={true} lines={LOADING_SKELETON_TEXT_LINES} />}
            >
              <PackageListGrid
                callout={
                  <IntegrationCardTopCallout
                    isAgentRequired={isAgentRequired}
                    installedIntegrationsCount={installedIntegrationsCount}
                    selectedTabId={toggleIdSelected}
                  />
                }
                calloutTopSpacerSize="m"
                categories={SEARCH_FILTER_CATEGORIES} // We do not want to show categories and subcategories as the search bar filter
                emptyStateStyles={emptyStateStyles}
                list={list}
                scrollElementId={SCROLL_ELEMENT_ID}
                searchTerm={searchTerm}
                selectedCategory={selectedTab.category ?? ''}
                selectedSubCategory={selectedTab.subCategory}
                setCategory={setCategory}
                setSearchTerm={onSearchTermChanged}
                setUrlandPushHistory={noop}
                setUrlandReplaceHistory={noop}
                showCardLabels={false}
                showControls={false}
                showSearchTools={selectedTab.showSearchTools}
                sortByFeaturedIntegrations={selectedTab.sortByFeaturedIntegrations}
                spacer={false}
              />
            </Suspense>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isModalVisible && startServices && (
          <EuiPortal>
            <EuiModal
              aria-labelledby={modalTitleId}
              onClose={closeModal}
              css={css`
                width: 85%;
              `}
              maxWidth="90%"
            >
              <EuiModalHeader>
                <EuiModalHeaderTitle id={modalTitleId}>Modal title</EuiModalHeaderTitle>
              </EuiModalHeader>
              <EuiModalBody>
                <UIExtensionsContextProvider values={{}}>
                  <FleetStatusProvider>
                    <PackageInstallProvider startServices={startServices}>
                      <IntegrationsStateContextProvider>
                        <Detail routesEnabled={false} />
                      </IntegrationsStateContextProvider>
                    </PackageInstallProvider>
                  </FleetStatusProvider>
                </UIExtensionsContextProvider>
              </EuiModalBody>
            </EuiModal>
          </EuiPortal>
        )}
      </>
    );
  }
);
IntegrationsCardGridTabsComponent.displayName = 'IntegrationsCardGridTabsComponent';

export const IntegrationsCardGridTabs = withLazyHook(
  IntegrationsCardGridTabsComponent,
  () => import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook()),
  <EuiSkeletonText
    data-test-subj="loadingPackages"
    isLoading={true}
    lines={LOADING_SKELETON_TEXT_LINES}
  />
);
IntegrationsCardGridTabs.displayName = 'IntegrationsCardGridTabs';
