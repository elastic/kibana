/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiSpacer, EuiEmptyPrompt } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results } from '@elastic/react-search-ui';
import { i18n } from '@kbn/i18n';

import { Loading } from '../../../../shared/loading';
import { EngineLogic } from '../../engine';
import { Result } from '../../result/types';

import { useSearchContextState } from './hooks';
import { Pagination } from './pagination';
import { ResultView } from './views';

export const SearchExperienceContent: React.FC = () => {
  const { resultSearchTerm, totalResults, wasSearched } = useSearchContextState();

  const { isMetaEngine, engine } = useValues(EngineLogic);

  if (!wasSearched) return <Loading />;

  if (totalResults) {
    return (
      <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="documentsSearchResults">
        <Pagination
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documents.paging.ariaLabelTop',
            {
              defaultMessage: 'Search results paging at top of results',
            }
          )}
        />
        <EuiSpacer />
        <Results
          titleField="id"
          resultView={({ result }: { result: Result }) => {
            return (
              <ResultView
                result={result}
                schemaForTypeHighlights={engine.schema}
                isMetaEngine={isMetaEngine}
              />
            );
          }}
        />
        <EuiSpacer />
        <Pagination
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documents.paging.ariaLabelBottom',
            {
              defaultMessage: 'Search results paging at bottom of results',
            }
          )}
        />
      </EuiFlexGroup>
    );
  }

  // If we have no results, but have a search term, show a message
  if (resultSearchTerm) {
    return (
      <EuiEmptyPrompt
        data-test-subj="documentsSearchNoResults"
        body={i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.noResults', {
          defaultMessage: 'No results for "{resultSearchTerm}" yet!',
          values: {
            resultSearchTerm,
          },
        })}
      />
    );
  }

  return null;
};
