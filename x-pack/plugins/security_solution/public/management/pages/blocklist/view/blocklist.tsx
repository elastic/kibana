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

// FIXME:PT delete this when real component is implemented
const TempDevFormComponent: ArtifactListPageProps['ArtifactFormComponent'] = (props) => {
  // For Dev. Delete once we implement this component
  // @ts-ignore
  if (!window._dev_artifact_form_props) {
    // @ts-ignore
    window._dev_artifact_form_props = [];
    // @ts-ignore
    window.console.log(window._dev_artifact_form_props);
  }
  // @ts-ignore
  window._dev_artifact_form_props.push(props);

  return (
    <div>
      <div style={{ margin: '3em 0' }}>
        {props.error ? props.error?.body?.message || props.error : ''}
      </div>
      {`TODO: ${props.mode} Form here`}
    </div>
  );
};

const BLOCKLIST_PAGE_LABELS: ArtifactListPageProps['labels'] = {
  pageTitle: i18n.translate('xpack.securitySolution.blocklist.pageTitle', {
    defaultMessage: 'Blocklist',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.blocklist.pageAboutInfo', {
    defaultMessage: 'Add a blocklist to block applications or files from running on the endpoint.',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.blocklist.pageAddButtonTitle', {
    defaultMessage: 'Add blocklist entry',
  }),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.blocklist.showingTotal', {
      defaultMessage: 'Showing {total} {total, plural, one {blocklist} other {blocklists}}',
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
};

export const Blocklist = memo(() => {
  const http = useHttp();
  const blocklistsApiClient = BlocklistsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={blocklistsApiClient}
      ArtifactFormComponent={TempDevFormComponent} // FIXME: Implement create/edit form
      labels={BLOCKLIST_PAGE_LABELS}
      data-test-subj="blocklistPage"
    />
  );
});

Blocklist.displayName = 'Blocklist';
