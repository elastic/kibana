/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage, ArtifactListPageProps } from '../../../components/artifact_list_page';
import { BlocklistsApiClient } from '../services';
import { BlockListForm } from './components/blocklist_form';

const BLOCKLIST_PAGE_LABELS: ArtifactListPageProps['labels'] = {
  pageTitle: i18n.translate('xpack.securitySolution.blocklist.pageTitle', {
    defaultMessage: 'Blocklist',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.blocklist.pageAboutInfo', {
    defaultMessage:
      'The blocklist prevents selected applications from running on your hosts by extending the list of processes the Endpoint considers malicious.',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.blocklist.pageAddButtonTitle', {
    defaultMessage: 'Add blocklist entry',
  }),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.blocklist.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {blocklist entry} other {blocklist entries}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate('xpack.securitySolution.blocklist.cardActionEditLabel', {
    defaultMessage: 'Edit blocklist',
  }),
  cardActionDeleteLabel: i18n.translate('xpack.securitySolution.blocklist.cardActionDeleteLabel', {
    defaultMessage: 'Delete blocklist',
  }),
  flyoutCreateTitle: i18n.translate('xpack.securitySolution.blocklist.flyoutCreateTitle', {
    defaultMessage: 'Add blocklist',
  }),
  flyoutEditTitle: i18n.translate('xpack.securitySolution.blocklist.flyoutEditTitle', {
    defaultMessage: 'Edit blocklist',
  }),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.blocklist.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add blocklist' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.blocklist.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your blocklist.', // FIXME: match this to design (needs count of items)
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.blocklist.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: () => {
    return 'tbd...';
    // FIXME: define docs link for license downgrade message. sample code below

    // const { docLinks } = useKibana().services;
    // return (
    //   <FormattedMessage
    //     id="some-id-1"
    //     defaultMessage="For more information, see our {link}."
    //     value={{
    //       link: (
    //         <EuiLink target="_blank" href={`${docLinks.links.securitySolution.eventFilters}`}>
    //           {' '}
    //           <FormattedMessage
    //             id="dome-id-2"
    //             defaultMessage="Event filters documentation"
    //           />{' '}
    //         </EuiLink>
    //       ),
    //     }}
    //   />
    // );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.blocklist.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from blocklist.',
      values: { itemName },
    }),
  emptyStateTitle: i18n.translate('xpack.securitySolution.blocklist.emptyStateTitle', {
    defaultMessage: 'Add your first blocklist',
  }),
  emptyStateInfo: i18n.translate(
    'xpack.securitySolution.blocklist.emptyStateInfo',
    { defaultMessage: 'Add a blocklist to prevent execution on the endpoint' } // FIXME: need wording here form PM
  ),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.blocklist.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add blocklist' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.artifactListPage.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
};

export const Blocklist = memo(() => {
  const http = useHttp();
  const blocklistsApiClient = BlocklistsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={blocklistsApiClient}
      ArtifactFormComponent={BlockListForm}
      labels={BLOCKLIST_PAGE_LABELS}
      data-test-subj="blocklistPage"
      flyoutSize="l"
    />
  );
});

Blocklist.displayName = 'Blocklist';
