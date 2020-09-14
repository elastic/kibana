/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { hasDeletionError } from '../store/selectors';
import { useToasts } from '../../../../common/lib/kibana';
import { useTrustedAppsSelector } from './hooks';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { TrustedAppsList } from './trusted_apps_list';
import { TrustedAppDeletionDialog } from './trusted_app_deletion_dialog';

const getDeletionError = () => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.deletionError.title', {
      defaultMessage: 'Could not delete the entry',
    }),
    text: i18n.translate('xpack.securitySolution.trustedapps.deletionError.text', {
      defaultMessage: 'Please try refreshing the list and performing operation again.',
    }),
  };
};

export const TrustedAppsPage = memo(() => {
  const toasts = useToasts();

  if (useTrustedAppsSelector(hasDeletionError)) {
    toasts.addDanger(getDeletionError());
  }

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
    >
      <TrustedAppDeletionDialog />
      <TrustedAppsList />
    </AdministrationListPage>
  );
});

TrustedAppsPage.displayName = 'TrustedAppsPage';
