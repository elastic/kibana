/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { ViewType } from '../state';
import {
  checkingIfEntriesExist,
  entriesExist,
  getCurrentLocation,
  getListTotalItemsCount,
} from '../store/selectors';
import { useTrustedAppsNavigateCallback, useTrustedAppsSelector } from './hooks';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { CreateTrustedAppFlyout } from './components/create_trusted_app_flyout';
import { ControlPanel } from './components/control_panel';
import { TrustedAppsGrid } from './components/trusted_apps_grid';
import { TrustedAppsList } from './components/trusted_apps_list';
import { TrustedAppDeletionDialog } from './trusted_app_deletion_dialog';
import { TrustedAppsNotifications } from './trusted_apps_notifications';
import { ABOUT_TRUSTED_APPS, SEARCH_TRUSTED_APP_PLACEHOLDER } from './translations';
import { EmptyState } from './components/empty_state';
import { SearchBar } from '../../../components/search_bar';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button';
import { ListPageRouteState } from '../../../../../common/endpoint/types';

export const TrustedAppsPage = memo(() => {
  const { state: routeState } = useLocation<ListPageRouteState | undefined>();
  const location = useTrustedAppsSelector(getCurrentLocation);
  const totalItemsCount = useTrustedAppsSelector(getListTotalItemsCount);
  const isCheckingIfEntriesExists = useTrustedAppsSelector(checkingIfEntriesExist);
  const doEntriesExist = useTrustedAppsSelector(entriesExist) === true;
  const handleAddButtonClick = useTrustedAppsNavigateCallback(() => ({
    show: 'create',
    id: undefined,
  }));
  const handleAddFlyoutClose = useTrustedAppsNavigateCallback(() => ({
    show: undefined,
    id: undefined,
  }));
  const handleViewTypeChange = useTrustedAppsNavigateCallback((viewType: ViewType) => ({
    view_type: viewType,
  }));
  const handleOnSearch = useTrustedAppsNavigateCallback((query: string) => ({ filter: query }));

  const showCreateFlyout = !!location.show;

  const backButton = useMemo(() => {
    if (routeState && routeState.onBackButtonNavigateTo) {
      return <BackToExternalAppButton {...routeState} />;
    }
    return null;
  }, [routeState]);

  const addButton = (
    <EuiButton
      fill
      iconType="plusInCircle"
      isDisabled={showCreateFlyout}
      onClick={handleAddButtonClick}
      data-test-subj="trustedAppsListAddButton"
    >
      <FormattedMessage
        id="xpack.securitySolution.trustedapps.list.addButton"
        defaultMessage="Add Trusted Application"
      />
    </EuiButton>
  );

  const content = (
    <>
      <TrustedAppDeletionDialog />

      {showCreateFlyout && (
        <CreateTrustedAppFlyout
          onClose={handleAddFlyoutClose}
          size="m"
          data-test-subj="addTrustedAppFlyout"
        />
      )}

      {doEntriesExist ? (
        <>
          <SearchBar
            defaultValue={location.filter}
            onSearch={handleOnSearch}
            placeholder={SEARCH_TRUSTED_APP_PLACEHOLDER}
          />
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            data-test-subj="trustedAppsListPageContent"
          >
            <EuiSpacer size="m" />
            <EuiFlexItem grow={false}>
              <ControlPanel
                totalItemCount={totalItemsCount}
                currentViewType={location.view_type}
                onViewTypeChange={handleViewTypeChange}
              />

              <EuiSpacer size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" />

              {location.view_type === 'grid' && <TrustedAppsGrid />}
              {location.view_type === 'list' && <TrustedAppsList />}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EmptyState onAdd={handleAddButtonClick} isAddDisabled={showCreateFlyout} />
      )}
    </>
  );

  return (
    <AdministrationListPage
      data-test-subj="trustedAppsListPage"
      beta={false}
      title={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageTitle"
          defaultMessage="Trusted Applications"
        />
      }
      headerBackComponent={backButton}
      subtitle={ABOUT_TRUSTED_APPS}
      actions={doEntriesExist ? addButton : <></>}
    >
      <TrustedAppsNotifications />

      {isCheckingIfEntriesExists ? (
        <EuiEmptyPrompt
          data-test-subj="trustedAppsListLoader"
          body={<EuiLoadingSpinner className="essentialAnimation" size="xl" />}
        />
      ) : (
        content
      )}
    </AdministrationListPage>
  );
});

TrustedAppsPage.displayName = 'TrustedAppsPage';
