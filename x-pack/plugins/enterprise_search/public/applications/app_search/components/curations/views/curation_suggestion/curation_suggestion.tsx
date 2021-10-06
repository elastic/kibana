/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDecodedParams } from '../../../../utils/encode_path_params';
import { EngineLogic } from '../../../engine';
import { AppSearchPageTemplate } from '../../../layout';
import { Result } from '../../../result';
import { Result as ResultType } from '../../../result/types';
import { convertToResultFormat } from '../../curation/results';
import { getCurationsBreadcrumbs } from '../../utils';

import { CurationActionBar } from './curation_action_bar';
import { CurationResultPanel } from './curation_result_panel';

import { CurationSuggestionLogic } from './curation_suggestion_logic';
import { DATA } from './temp_data';

export const CurationSuggestion: React.FC = () => {
  const { query } = useDecodedParams();
  const { engine, isMetaEngine } = useValues(EngineLogic);
  const curationSuggestionLogic = CurationSuggestionLogic({ query });
  const { loadSuggestion } = useActions(curationSuggestionLogic);
  const { suggestion, suggestedPromotedDocuments, curation, dataLoading } =
    useValues(curationSuggestionLogic);
  const [showOrganicResults, setShowOrganicResults] = useState(false);
  const currentOrganicResults = [...DATA].splice(5, 4);
  const proposedOrganicResults = [...DATA].splice(2, 4);
  const existingCurationResults = curation ? curation.promoted.map(convertToResultFormat) : [];

  const suggestionQuery = suggestion?.query || '';

  useEffect(() => {
    loadSuggestion();
  }, []);

  return (
    <AppSearchPageTemplate
      isLoading={dataLoading}
      pageChrome={getCurationsBreadcrumbs([
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.breadcrumbLabel',
          { defaultMessage: 'Suggested: {query}', values: { query: suggestionQuery } }
        ),
      ])}
      pageHeader={{
        pageTitle: suggestionQuery,
      }}
    >
      <CurationActionBar
        onAcceptClick={() => alert('Accepted')}
        onRejectClick={() => alert('Rejected')}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.currentTitle',
                { defaultMessage: 'Current' }
              )}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CurationResultPanel variant="current" results={existingCurationResults} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.suggestionTitle',
                { defaultMessage: 'Suggested' }
              )}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CurationResultPanel variant="suggested" results={suggestedPromotedDocuments} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="none">
        <EuiButtonEmpty
          color="text"
          size="s"
          style={{ width: '100%' }}
          iconType={showOrganicResults ? 'fold' : 'unfold'}
          iconSide="right"
          onClick={() => setShowOrganicResults(!showOrganicResults)}
          data-test-subj="showOrganicResults"
        >
          {showOrganicResults
            ? i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.collapseButtonLabel',
                { defaultMessage: 'Collapse organic search results' }
              )
            : i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.expandButtonLabel',
                { defaultMessage: 'Expand organic search results' }
              )}
        </EuiButtonEmpty>
        {showOrganicResults && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiPanel hasShadow={false} data-test-subj="organicResults">
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  {currentOrganicResults.length > 0 && (
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      data-test-subj="currentOrganicResults"
                    >
                      {currentOrganicResults.map((result: ResultType) => (
                        <EuiFlexItem grow={false} key={result.id.raw}>
                          <Result
                            result={result}
                            isMetaEngine={isMetaEngine}
                            schemaForTypeHighlights={engine.schema}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  {proposedOrganicResults.length > 0 && (
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      data-test-subj="proposedOrganicResults"
                    >
                      {proposedOrganicResults.map((result: ResultType) => (
                        <EuiFlexItem grow={false} key={result.id.raw}>
                          <Result
                            result={result}
                            isMetaEngine={isMetaEngine}
                            schemaForTypeHighlights={engine.schema}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
