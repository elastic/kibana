/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import type { ArtifactListPageProps } from '../../../components/artifact_list_page';
import { HostIsolationExceptionsApiClient } from '../host_isolation_exceptions_api_client';

const HOST_ISOLATION_EXCEPTIONS_LABELS: ArtifactListPageProps['labels'] = Object.freeze({
  pageTitle: i18n.translate('xpack.securitySolution.hostIsolationExceptions.pageTitle', {
    defaultMessage: 'Host isolation exceptions',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.hostIsolationExceptions.pageAboutInfo', {
    defaultMessage:
      'Add a host isolation exception to allow isolated hosts to communicate with specific IPs.',
  }),
  pageAddButtonTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.pageAddButtonTitle',
    {
      defaultMessage: 'Add host isolation exception',
    }
  ),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {host isolation exception} other {host isolation exceptions}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.cardActionEditLabel',
    {
      defaultMessage: 'Edit exception',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete exception',
    }
  ),
  flyoutCreateTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutCreateTitle',
    {
      defaultMessage: 'Add host isolation exception',
    }
  ),
  flyoutEditTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutEditTitle',
    {
      defaultMessage: 'Edit host isolation exception',
    }
  ),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add host isolation exception' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your host isolation exception list.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: () => {
    // Host Isolation Exceptions does not need to show a downgrade license message because
    // this feature is only available for license levels that also includes per-policy functionality.
    return null;
  },
  deleteModalTitle: () =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.deleteModtalTitle', {
      defaultMessage: 'Delete host isolation exception',
    }),
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from host isolation exception list.',
      values: { itemName },
    }),
  emptyStateTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.emptyStateTitle',
    {
      defaultMessage: 'Add your first host isolation exception',
    }
  ),
  emptyStateInfo: i18n.translate('xpack.securitySolution.hostIsolationExceptions.emptyStateInfo', {
    defaultMessage:
      'Add a host isolation exception to allow isolated hosts to communicate with specific IPs.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add host isolation exception' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, IP',
    }
  ),
});

const TempForm = () => <div>{'FORM GOES HERE'}</div>;

export const HostIsolationExceptionsList = memo(() => {
  const http = useHttp();
  const hostIsolationExceptionsApiClient = HostIsolationExceptionsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={hostIsolationExceptionsApiClient}
      ArtifactFormComponent={TempForm}
      labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
      data-test-subj="hostIsolationExceptionsListPage"
    />
  );
});
HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';
