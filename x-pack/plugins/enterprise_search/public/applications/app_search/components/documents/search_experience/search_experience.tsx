/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { useValues } from 'kea';
// @ts-expect-error types are not available for this package yet
import { SearchProvider, SearchBox, Results } from '@elastic/react-search-ui';
// @ts-expect-error types are not available for this package yet
import AppSearchAPIConnector from '@elastic/search-ui-app-search-connector';

import './search_experience.scss';

import { EngineLogic } from '../../engine';
import { externalUrl } from '../../../../shared/enterprise_search_url';

import { SearchBoxView } from './views';

export const SearchExperience: React.FC = () => {
  const { engine } = useValues(EngineLogic);
  const endpointBase = externalUrl.enterpriseSearchUrl;

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
    <div className="documents-search-experience">
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
        <Results />
      </SearchProvider>
    </div>
  );
};
