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
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDecodedParams } from '../../../../utils/encode_path_params';
import { AppSearchPageTemplate } from '../../../layout';
import { getCurationsBreadcrumbs } from '../../utils';

import { CurationActionBar } from './curation_action_bar';
import { CurationResultPanel } from './curation_result_panel';

export const CurationSuggestion: React.FC = () => {
  const { query } = useDecodedParams();
  const [showOrganicResults, setShowOrganicResults] = useState(false);

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
          <CurationResultPanel variant="current" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2>Suggested</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CurationResultPanel variant="suggested" />
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
          <EuiPanel hasShadow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiPanel hasBorder>A search result</EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiPanel hasBorder>A search result</EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
