/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiFieldSearch, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../engine';
import { Result } from '../result/result';

import { RelevanceTuningLogic } from '.';

const emptyCallout = (
  <EuiEmptyPrompt
    data-test-subj="EmptyQueryPrompt"
    iconType="glasses"
    body={i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.enterQueryMessage',
      {
        defaultMessage: 'Enter a query to see search results',
      }
    )}
  />
);

const noResultsCallout = (
  <EuiEmptyPrompt
    data-test-subj="NoResultsPrompt"
    body={i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.noResultsMessage',
      {
        defaultMessage: 'No matching content found',
      }
    )}
  />
);

export const RelevanceTuningPreview: React.FC = () => {
  const { setSearchQuery } = useActions(RelevanceTuningLogic);
  const { searchResults, schema } = useValues(RelevanceTuningLogic);
  const { engineName, isMetaEngine } = useValues(EngineLogic);

  return (
    <EuiPanel color="subdued">
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.title', {
            defaultMessage: 'Preview',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiFieldSearch
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.searchPlaceholder',
          {
            defaultMessage: 'Search {engineName}',
            values: {
              engineName,
            },
          }
        )}
        fullWidth
      />
      {!searchResults && emptyCallout}
      {searchResults && searchResults.length === 0 && noResultsCallout}
      {searchResults &&
        searchResults.map((result) => {
          return (
            <React.Fragment key={result.id.raw}>
              <EuiSpacer size="m" />
              <Result
                result={result}
                showScore
                isMetaEngine={isMetaEngine}
                schemaForTypeHighlights={schema}
              />
            </React.Fragment>
          );
        })}
    </EuiPanel>
  );
};
