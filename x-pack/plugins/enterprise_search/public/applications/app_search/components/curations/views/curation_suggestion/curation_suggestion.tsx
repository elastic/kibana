/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

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
import { AppSearchPageTemplate } from '../../../layout';
import { Result } from '../../../result';
import { Result as ResultType } from '../../../result/types';
import { getCurationsBreadcrumbs } from '../../utils';

import { CurationActionBar } from './curation_action_bar';
import { CurationResultPanel } from './curation_result_panel';

import { DATA } from './temp_data';

export const CurationSuggestion: React.FC = () => {
  const { query } = useDecodedParams();
  const [showOrganicResults, setShowOrganicResults] = useState(false);
  const currentOrganicResults = [...DATA].splice(5, 4);
  const proposedOrganicResults = [...DATA].splice(2, 4);

  const queryTitle = query === '""' ? query : `${query}`;

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.breadcrumbLabel',
          { defaultMessage: 'Suggested: {query}', values: { query } }
        ),
      ])}
      pageHeader={{
        pageTitle: queryTitle,
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
            <h2>Current</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CurationResultPanel variant="current" results={[...DATA].splice(0, 3)} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2>Suggested</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CurationResultPanel variant="suggested" results={[...DATA].splice(3, 2)} />
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
        >
          {showOrganicResults ? 'Collapse' : 'Expand'} organic search results
        </EuiButtonEmpty>
        {showOrganicResults && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiPanel hasShadow={false}>
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  {currentOrganicResults.length > 0 && (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {currentOrganicResults.map((result: ResultType) => (
                        <EuiFlexItem grow={false}>
                          <Result result={result} isMetaEngine={false} />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  {proposedOrganicResults.length > 0 && (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {proposedOrganicResults.map((result: ResultType) => (
                        <EuiFlexItem grow={false}>
                          <Result result={result} isMetaEngine={false} />
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
