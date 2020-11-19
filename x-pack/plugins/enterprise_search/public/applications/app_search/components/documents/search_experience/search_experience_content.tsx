/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results, Paging, ResultsPerPage } from '@elastic/react-search-ui';
import { useValues } from 'kea';

import { EngineLogic } from '../../engine';
import { ResultView, PagingView, ResultsPerPageView } from './views';

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

export const SearchExperienceContent: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
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
};
