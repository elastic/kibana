/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { useValues } from 'kea';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet;
import { SearchProvider, SearchBox, Sorting } from '@elastic/react-search-ui';
// @ts-expect-error types are not available for this package yet
import AppSearchAPIConnector from '@elastic/search-ui-app-search-connector';

import './search_experience.scss';

import { EngineLogic } from '../../engine';
import { externalUrl } from '../../../../shared/enterprise_search_url';

import { SearchBoxView, SortingView } from './views';
import { SearchExperienceContent } from './search_experience_content';

const DEFAULT_SORT_OPTIONS = [
  {
    name: i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.recentlyUploadedDesc', {
      defaultMessage: 'Recently Uploaded (desc)',
    }),
    value: 'id',
    direction: 'desc',
  },
  {
    name: i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.recentlyUploadedAsc', {
      defaultMessage: 'Recently Uploaded (asc)',
    }),
    value: 'id',
    direction: 'asc',
  },
];

export const SearchExperience: React.FC = () => {
  const { engine } = useValues(EngineLogic);
  const endpointBase = externalUrl.enterpriseSearchUrl;

  // TODO const sortFieldsOptions = _flatten(fields.sortFields.map(fieldNameToSortOptions)) // we need to flatten this array since fieldNameToSortOptions returns an array of two sorting options
  const sortingOptions = [...DEFAULT_SORT_OPTIONS /* TODO ...sortFieldsOptions*/];

  const connector = new AppSearchAPIConnector({
    cacheResponses: false,
    endpointBase,
    engineName: engine.name,
    searchKey: engine.apiKey,
  });

  const searchProviderConfig = {
    alwaysSearchOnInitialLoad: true,
    apiConnector: connector,
    trackUrlState: false,
    initialState: {
      sortDirection: 'desc',
      sortField: 'id',
    },
  };

  return (
    <div className="documentsSearchExperience">
      <SearchProvider config={searchProviderConfig}>
        <SearchBox
          searchAsYouType={true}
          inputProps={{
            placeholder: i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.placeholder',
              {
                defaultMessage: 'Filter documents...',
              }
            ),
            'aria-label': i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.ariaLabel',
              {
                defaultMessage: 'Filter documents',
              }
            ),
            'data-test-subj': 'DocumentsFilterInput',
          }}
          view={SearchBoxView}
        />
        <EuiSpacer size="xl" />
        <EuiFlexGroup direction="row">
          <EuiFlexItem className="documentsSearchExperience__sidebar">
            <Sorting
              className="documentsSearchExperience__sorting"
              sortOptions={sortingOptions}
              view={SortingView}
            />
          </EuiFlexItem>
          <EuiFlexItem className="documentsSearchExperience__content">
            <SearchExperienceContent />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SearchProvider>
    </div>
  );
};
