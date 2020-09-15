/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { TrustedAppsList } from './trusted_apps_list';
import { CreateTrustedAppFlyout } from './components/create_trusted_app_flyout';
import { getTrustedAppsListPath } from '../../../common/routing';
import { useTrustedAppsSelector } from './hooks';
import { getListCurrentShowValue, getListUrlSearchParams } from '../store/selectors';

export const TrustedAppsPage = memo(() => {
  const history = useHistory();
  const urlParams = useTrustedAppsSelector(getListUrlSearchParams);
  const showAddFlout = useTrustedAppsSelector(getListCurrentShowValue) === 'create';
  const handleAddButtonClick = useCallback(() => {
    history.push(
      getTrustedAppsListPath({
        ...urlParams,
        show: 'create',
      })
    );
  }, [history, urlParams]);
  const handleAddFlyoutClose = useCallback(() => {
    const { show, ...paginationParamsOnly } = urlParams;
    history.push(getTrustedAppsListPath(paginationParamsOnly));
  }, [history, urlParams]);

  const addButton = (
    <EuiButton
      fill
      iconType="plusInCircle"
      isDisabled={showAddFlout}
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
      beta={true}
      title={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageTitle"
          defaultMessage="Trusted Applications"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageSubTitle"
          defaultMessage="View and configure trusted applications"
        />
      }
      actions={addButton}
    >
      {showAddFlout && (
        <CreateTrustedAppFlyout
          onClose={handleAddFlyoutClose}
          size="s"
          data-test-subj="addTrustedAppFlyout"
        />
      )}
      <TrustedAppsList />
    </AdministrationListPage>
  );
});

TrustedAppsPage.displayName = 'TrustedAppsPage';
