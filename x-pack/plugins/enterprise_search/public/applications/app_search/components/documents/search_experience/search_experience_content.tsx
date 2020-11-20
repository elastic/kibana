/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results, Paging, ResultsPerPage } from '@elastic/react-search-ui';
import { useValues } from 'kea';

import { ResultView, PagingView, ResultsPerPageView } from './views';
import { useSearchContextState } from './hooks';
import { DocumentCreationButton } from '../document_creation_button';
import { AppLogic } from '../../../app_logic';
import { EngineLogic } from '../../engine';
import { DOCS_PREFIX } from '../../../routes';

const Pagination: React.FC<{ 'aria-label': string }> = ({ 'aria-label': ariaLabel }) => (
  <EuiFlexGroup alignItems="center" className="documents-search-experience__paging-info">
    <EuiFlexItem>
      <Paging view={PagingView} aria-label={ariaLabel} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <ResultsPerPage view={ResultsPerPageView} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
// TODO This is temporary until we create real Result type
interface Result {
  [key: string]: {
    raw: string | string[] | number | number[] | undefined;
  };
}

const DocumentationLink: React.FC = () => (
  <EuiButton
    data-test-subj="documentsSearchDocsLink"
    href={`${DOCS_PREFIX}/indexing-documents-guide.html`}
  >
    {i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.indexingGuide', {
      defaultMessage: 'Read the Indexing Guide',
    })}
  </EuiButton>
);

export const SearchExperienceContent: React.FC = () => {
  const { resultSearchTerm, totalResults, wasSearched } = useSearchContextState();

  const { myRole } = useValues(AppLogic);
  const { engineName, isMetaEngine } = useValues(EngineLogic);

  if (!wasSearched) {
    return null;
  }

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
          resultView={(props: { result: Result }) => {
            return <ResultView {...props} engineName={engineName} />;
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

  // If we have no results AND no search term, show a CTA for the user to index documents
  return (
    <>
      <div />
      <EuiEmptyPrompt
        data-test-subj="documentsSearchNoDocuments"
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.indexDocumentsTitle',
              {
                defaultMessage: 'No documents yet!',
              }
            )}
          </h2>
        }
        body={i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.indexDocuments', {
          defaultMessage: 'Indexed documents will show up here.',
        })}
        actions={
          !isMetaEngine && myRole.canManageEngineDocuments ? (
            <DocumentCreationButton />
          ) : (
            <DocumentationLink />
          )
        }
      />
    </>
  );
};
