/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  checkingIfEntriesExist,
  entriesExist,
  getCurrentLocation,
  getListTotalItemsCount,
  listOfPolicies,
  prevEntriesExist,
} from '../store/selectors';
import { useTrustedAppsNavigateCallback, useTrustedAppsSelector } from './hooks';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { CreateTrustedAppFlyout } from './components/create_trusted_app_flyout';
import { TrustedAppsGrid } from './components/trusted_apps_grid';
import { TrustedAppDeletionDialog } from './trusted_app_deletion_dialog';
import { TrustedAppsNotifications } from './trusted_apps_notifications';
import { AppAction } from '../../../../common/store/actions';
import { ABOUT_TRUSTED_APPS, SEARCH_TRUSTED_APP_PLACEHOLDER } from './translations';
import { EmptyState } from './components/empty_state';
import { SearchExceptions } from '../../../components/search_exceptions';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button';
import { ListPageRouteState } from '../../../../../common/endpoint/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

export const TrustedAppsPage = memo(() => {
  const isTrustedAppsByPolicyEnabled = useIsExperimentalFeatureEnabled(
    'trustedAppsByPolicyEnabled'
  );
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const { state: routeState } = useLocation<ListPageRouteState | undefined>();
  const location = useTrustedAppsSelector(getCurrentLocation);
  const totalItemsCount = useTrustedAppsSelector(getListTotalItemsCount);
  const isCheckingIfEntriesExists = useTrustedAppsSelector(checkingIfEntriesExist);
  const policyList = useTrustedAppsSelector(listOfPolicies);
  const doEntriesExist = useTrustedAppsSelector(entriesExist);
  const didEntriesExist = useTrustedAppsSelector(prevEntriesExist);
  const navigationCallbackQuery = useTrustedAppsNavigateCallback(
    (query: string, includedPolicies?: string, excludedPolicies?: string) => ({
      filter: query,
      included_policies: includedPolicies,
      excluded_policies: excludedPolicies,
    })
  );

  const handleAddButtonClick = useTrustedAppsNavigateCallback(() => ({
    show: 'create',
    id: undefined,
  }));
  const handleAddFlyoutClose = useTrustedAppsNavigateCallback(() => ({
    show: undefined,
    id: undefined,
  }));

  const handleOnSearch = useCallback(
    (query: string, includedPolicies?: string, excludedPolicies?: string) => {
      dispatch({ type: 'trustedAppForceRefresh', payload: { forceRefresh: true } });
      navigationCallbackQuery(query, includedPolicies, excludedPolicies);
    },
    [dispatch, navigationCallbackQuery]
  );

  const showCreateFlyout = !!location.show;

  const canDisplayContent = useCallback(
    () => doEntriesExist || (isCheckingIfEntriesExists && didEntriesExist),
    [didEntriesExist, doEntriesExist, isCheckingIfEntriesExists]
  );

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
        defaultMessage="Add trusted application"
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

      {canDisplayContent() ? (
        <>
          <SearchExceptions
            defaultValue={location.filter}
            onSearch={handleOnSearch}
            placeholder={SEARCH_TRUSTED_APP_PLACEHOLDER}
            hasPolicyFilter={isTrustedAppsByPolicyEnabled}
            policyList={policyList}
            defaultExcludedPolicies={location.excluded_policies}
            defaultIncludedPolicies={location.included_policies}
          />
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            data-test-subj="trustedAppsListPageContent"
          >
            <EuiSpacer size="m" />
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs" data-test-subj="trustedAppsListViewCountLabel">
                {i18n.translate('xpack.securitySolution.trustedapps.list.totalCount', {
                  defaultMessage:
                    'Showing {totalItemsCount, plural, one {# trusted application} other {# trusted applications}}',
                  values: { totalItemsCount },
                })}
              </EuiText>

              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <TrustedAppsGrid />
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
      title={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageTitle"
          defaultMessage="Trusted applications"
        />
      }
      headerBackComponent={backButton}
      subtitle={ABOUT_TRUSTED_APPS}
      actions={addButton}
      hideHeader={!canDisplayContent()}
    >
      <TrustedAppsNotifications />

      {isCheckingIfEntriesExists && !didEntriesExist ? (
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
