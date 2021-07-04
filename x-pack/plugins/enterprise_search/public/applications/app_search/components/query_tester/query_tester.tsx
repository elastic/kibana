/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiFieldSearch, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../engine';
import { Result } from '../result';
import { SearchLogic } from '../search';

export const QueryTester: React.FC = () => {
  const logic = SearchLogic({ id: 'query-tester' });
  const { searchQuery, searchResults, searchDataLoading } = useValues(logic);
  const { search } = useActions(logic);
  const { engine } = useValues(EngineLogic);

  return (
    <>
      <EuiFieldSearch
        value={searchQuery}
        onChange={(e) => search(e.target.value)}
        isLoading={searchDataLoading}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.queryTester.searchPlaceholder',
          { defaultMessage: 'Search engine documents' }
        )}
        fullWidth
        autoFocus
      />
      <EuiSpacer />
      {searchResults.length > 0 ? (
        searchResults.map((result) => {
          const id = result.id.raw;

          return (
            <React.Fragment key={id}>
              <Result
                isMetaEngine={false}
                key={id}
                result={result}
                schemaForTypeHighlights={engine.schema}
                showScore
              />
              <EuiSpacer size="m" />
            </React.Fragment>
          );
        })
      ) : (
        <EuiEmptyPrompt
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.addResult.searchEmptyDescription',
            { defaultMessage: 'No matching content found.' }
          )}
        />
      )}
    </>
  );
};
