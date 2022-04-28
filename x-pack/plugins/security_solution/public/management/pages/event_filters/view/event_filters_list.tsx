/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinks } from '@kbn/doc-links';
import { EuiLink } from '@elastic/eui';

import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage, ArtifactListPageProps } from '../../../components/artifact_list_page';
import { EventFiltersApiClient } from '../service/api_client';
import { EventFiltersForm } from './components/form';
import { SEARCHABLE_FIELDS } from '../constants';

const EVENT_FILTERS_PAGE_LABELS: ArtifactListPageProps['labels'] = {
  pageTitle: i18n.translate('xpack.securitySolution.eventFilters.pageTitle', {
    defaultMessage: 'Event Filters',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.eventFilters.pageAboutInfo', {
    defaultMessage:
      'Event filters exclude high volume or unwanted events from being written to Elasticsearch.',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.eventFilters.pageAddButtonTitle', {
    defaultMessage: 'Add event filter',
  }),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.eventFilters.showingTotal', {
      defaultMessage: 'Showing {total} {total, plural, one {event filter} other {event filters}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate('xpack.securitySolution.eventFilters.cardActionEditLabel', {
    defaultMessage: 'Edit event filter',
  }),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.eventFilters.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete event filter',
    }
  ),
  flyoutCreateTitle: i18n.translate('xpack.securitySolution.eventFilters.flyoutCreateTitle', {
    defaultMessage: 'Add event filter',
  }),
  flyoutEditTitle: i18n.translate('xpack.securitySolution.eventFilters.flyoutEditTitle', {
    defaultMessage: 'Edit event filter',
  }),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.eventFilters.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add event filter' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.eventFilters.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to the event filters list.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.eventFilters.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: (
    securitySolutionDocsLinks: DocLinks['securitySolution']
  ): React.ReactNode => {
    return (
      <>
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.flyoutDowngradedLicenseDocsInfo"
          defaultMessage="For more information, see our "
        />
        <EuiLink target="_blank" href={`${securitySolutionDocsLinks.eventFilters}`}>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.flyoutDowngradedLicenseDocsLink"
            defaultMessage="Event filters documentation"
          />
        </EuiLink>
      </>
    );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.eventFilters.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from event filters list.',
      values: { itemName },
    }),
  emptyStateTitle: i18n.translate('xpack.securitySolution.eventFilters.emptyStateTitle', {
    defaultMessage: 'Add your first event filter',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.eventFilters.emptyStateInfo', {
    defaultMessage:
      'Add an event filter to exclude high volume or unwanted events from being written to Elasticsearch.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.eventFilters.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add event filter' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.eventFilters.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, comments, value',
    }
  ),
};

export const EventFiltersList = memo(() => {
  const http = useHttp();
  const eventFiltersApiClient = EventFiltersApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={eventFiltersApiClient}
      ArtifactFormComponent={EventFiltersForm}
      labels={EVENT_FILTERS_PAGE_LABELS}
      data-test-subj="EventFiltersList"
      searchableFields={SEARCHABLE_FIELDS}
    />
  );
});

EventFiltersList.displayName = 'EventFiltersList';
