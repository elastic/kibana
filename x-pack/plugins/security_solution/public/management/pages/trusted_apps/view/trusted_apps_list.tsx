/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinks } from '@kbn/doc-links';
import { EuiLink } from '@elastic/eui';

import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useHttp } from '../../../../common/lib/kibana';
import type { ArtifactListPageProps } from '../../../components/artifact_list_page';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { TrustedAppsApiClient } from '../service';
import { TrustedAppsForm } from './components/form';
import { SEARCHABLE_FIELDS } from '../constants';
import { TrustedAppsArtifactsDocsLink } from './components/artifacts_docs_link';

const TRUSTED_APPS_PAGE_LABELS: ArtifactListPageProps['labels'] = {
  pageTitle: i18n.translate('xpack.securitySolution.trustedApps.pageTitle', {
    defaultMessage: 'Trusted applications',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.trustedApps.pageAboutInfo', {
    defaultMessage:
      'Add a trusted application to improve performance or alleviate conflicts with other applications running on your hosts. Trusted applications may still generate alerts in some cases.',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.trustedApps.pageAddButtonTitle', {
    defaultMessage: 'Add trusted application',
  }),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.trustedApps.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {trusted application} other {trusted applications}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate('xpack.securitySolution.trustedApps.cardActionEditLabel', {
    defaultMessage: 'Edit trusted application',
  }),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.trustedApps.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete trusted application',
    }
  ),
  flyoutCreateTitle: i18n.translate('xpack.securitySolution.trustedApps.flyoutCreateTitle', {
    defaultMessage: 'Add trusted application',
  }),
  flyoutEditTitle: i18n.translate('xpack.securitySolution.trustedApps.flyoutEditTitle', {
    defaultMessage: 'Edit trusted application',
  }),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.trustedApps.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add trusted application' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.trustedApps.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your trusted applications.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.trustedApps.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: (
    securitySolutionDocsLinks: DocLinks['securitySolution']
  ): React.ReactNode => {
    return (
      <>
        <FormattedMessage
          id="xpack.securitySolution.trustedApps.flyoutDowngradedLicenseDocsInfo"
          defaultMessage="For more information, see our "
        />
        <EuiLink target="_blank" href={`${securitySolutionDocsLinks.trustedApps}`}>
          <FormattedMessage
            id="xpack.securitySolution.trustedApps.flyoutDowngradedLicenseDocsLink"
            defaultMessage="Trusted applications documentation"
          />
        </EuiLink>
      </>
    );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.trustedApps.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from trusted applications.',
      values: { itemName },
    }),
  emptyStateTitleNoEntries: i18n.translate(
    'xpack.securitySolution.trustedApps.emptyStateTitleNoEntries',
    {
      defaultMessage: 'There are no trusted applications to display.',
    }
  ),
  emptyStateTitle: i18n.translate('xpack.securitySolution.trustedApps.emptyStateTitle', {
    defaultMessage: 'Add your first trusted application',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.trustedApps.emptyStateInfo', {
    defaultMessage:
      'Add a trusted application to improve performance or alleviate conflicts with other applications running on your hosts. Trusted applications may still generate alerts in some cases.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.trustedApps.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add trusted application' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.trustedApps.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
};

export const TrustedAppsList = memo(() => {
  const { canWriteTrustedApplications } = useUserPrivileges().endpointPrivileges;
  const http = useHttp();
  const trustedAppsApiClient = TrustedAppsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={trustedAppsApiClient}
      ArtifactFormComponent={TrustedAppsForm}
      labels={TRUSTED_APPS_PAGE_LABELS}
      data-test-subj="trustedAppsListPage"
      searchableFields={SEARCHABLE_FIELDS}
      secondaryPageInfo={<TrustedAppsArtifactsDocsLink />}
      allowCardDeleteAction={canWriteTrustedApplications}
      allowCardEditAction={canWriteTrustedApplications}
      allowCardCreateAction={canWriteTrustedApplications}
    />
  );
});

TrustedAppsList.displayName = 'TrustedAppsList';
