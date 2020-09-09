/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { TrustedAppsList } from './trusted_apps_list';
import { NewTrustedAppFlyout } from './components/NewTrustedAppFlyout';

export const TrustedAppsPage = memo(() => {
  const [isAddFlyoutOpen, setAddFlyoutOpen] = useState<boolean>(false);
  const handleAddButtonClick = useCallback(() => {
    setAddFlyoutOpen((prevState) => {
      return !prevState;
    });
  }, []);
  const handleAddFlyoutClose = useCallback(() => {
    setAddFlyoutOpen(false);
  }, []);

  const addButton = (
    <EuiButton
      fill
      iconType="plusInCircle"
      isDisabled={isAddFlyoutOpen}
      onClick={handleAddButtonClick}
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
      {isAddFlyoutOpen && <NewTrustedAppFlyout onClose={handleAddFlyoutClose} size="s" />}
      <TrustedAppsList />
    </AdministrationListPage>
  );
});

TrustedAppsPage.displayName = 'TrustedAppsPage';
