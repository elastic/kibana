/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { TrustedAppsList } from './trusted_apps_list';
import { TrustedAppDeletionDialog } from './trusted_app_deletion_dialog';
import { TrustedAppsNotifications } from './trusted_apps_notifications';
import { CreateTrustedAppFlyout } from './components/create_trusted_app_flyout';
import { getTrustedAppsListPath } from '../../../common/routing';
import { useTrustedAppsSelector } from './hooks';
import { getCurrentLocation } from '../store/selectors';
import { TrustedAppsListPageRouteState } from '../../../../../common/endpoint/types';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export const TrustedAppsPage = memo(() => {
  const history = useHistory();
  const { state: routeState } = useLocation<TrustedAppsListPageRouteState | undefined>();
  const location = useTrustedAppsSelector(getCurrentLocation);
  const handleAddButtonClick = useCallback(() => {
    history.push(
      getTrustedAppsListPath({
        ...location,
        show: 'create',
      })
    );
  }, [history, location]);
  const handleAddFlyoutClose = useCallback(() => {
    const { show, ...paginationParamsOnly } = location;
    history.push(getTrustedAppsListPath(paginationParamsOnly));
  }, [history, location]);

  const backButton = useMemo(() => {
    if (routeState && routeState.onBackButtonNavigateTo) {
      return <BackToExternalAppButton {...routeState} />;
    }
    return null;
    // FIXME: Route state is being deleted by some parent component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addButton = (
    <EuiButton
      fill
      iconType="plusInCircle"
      isDisabled={location.show === 'create'}
      onClick={handleAddButtonClick}
      data-test-subj="trustedAppsListAddButton"
    >
      <FormattedMessage
        id="xpack.securitySolution.trustedapps.list.addButton"
        defaultMessage="Add Trusted Application"
      />
    </EuiButton>
  );

  return (
    <AdministrationListPage
      data-test-subj="trustedAppsListPage"
      beta={true}
      title={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageTitle"
          defaultMessage="Trusted Applications"
        />
      }
      headerBackComponent={backButton}
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageSubTitle"
          defaultMessage="View and configure trusted applications"
        />
      }
      actions={addButton}
    >
      <TrustedAppsNotifications />
      <TrustedAppDeletionDialog />
      {location.show === 'create' && (
        <CreateTrustedAppFlyout
          onClose={handleAddFlyoutClose}
          size="m"
          data-test-subj="addTrustedAppFlyout"
        />
      )}
      <TrustedAppsList />
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
