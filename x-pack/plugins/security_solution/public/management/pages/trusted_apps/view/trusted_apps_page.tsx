/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
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
import { TrustedAppsListPageRouteState } from '../../../../../common/endpoint/types';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { ABOUT_TRUSTED_APPS } from './translations';
import { EmptyState } from './components/empty_state';

export const TrustedAppsPage = memo(() => {
  const { state: routeState } = useLocation<TrustedAppsListPageRouteState | undefined>();
  const location = useTrustedAppsSelector(getCurrentLocation);
  const totalItemsCount = useTrustedAppsSelector(getListTotalItemsCount);
  const isCheckingIfEntriesExists = useTrustedAppsSelector(checkingIfEntriesExist);
  const doEntriesExist = useTrustedAppsSelector(entriesExist) === true;
  const handleAddButtonClick = useTrustedAppsNavigateCallback(() => ({ show: 'create' }));
  const handleAddFlyoutClose = useTrustedAppsNavigateCallback(() => ({ show: undefined }));
  const handleViewTypeChange = useTrustedAppsNavigateCallback((viewType: ViewType) => ({
    view_type: viewType,
  }));

  const showCreateFlyout = location.show === 'create';

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
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          data-test-subj="trustedAppsListPageContent"
        >
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

const EuiButtonEmptyStyled = styled(EuiButtonEmpty)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};

  .euiIcon {
    width: ${({ theme }) => theme.eui.euiIconSizes.small};
    height: ${({ theme }) => theme.eui.euiIconSizes.small};
  }

  .text {
    font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  }
`;

const BackToExternalAppButton = memo<TrustedAppsListPageRouteState>(
  ({ backButtonLabel, backButtonUrl, onBackButtonNavigateTo }) => {
    const handleBackOnClick = useNavigateToAppEventHandler(...onBackButtonNavigateTo!);

    return (
      <EuiButtonEmptyStyled
        flush="left"
        size="xs"
        iconType="arrowLeft"
        href={backButtonUrl!}
        onClick={handleBackOnClick}
        textProps={{ className: 'text' }}
        data-test-subj="backToOrigin"
      >
        {backButtonLabel || (
          <FormattedMessage
            id="xpack.securitySolution.trustedapps.list.backButton"
            defaultMessage="Back"
          />
        )}
      </EuiButtonEmptyStyled>
    );
  }
);

BackToExternalAppButton.displayName = 'BackToExternalAppButton';
