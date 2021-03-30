/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCodeBlock,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SampleResponseLogic } from './sample_response_logic';

export const SampleResponse: React.FC = () => {
  const { query, response } = useValues(SampleResponseLogic);
  const { queryChanged } = useActions(SampleResponseLogic);

  return (
    <EuiPanel hasShadow>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponseTitle',
                { defaultMessage: 'Sample response' }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* TODO <QueryPerformance queryPerformanceRating={queryPerformanceRating} /> */}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFieldSearch
        value={query}
        onChange={(e) => queryChanged(e.target.value)}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponse.inputPlaceholder',
          { defaultMessage: 'Type a search query to test a response...' }
        )}
        data-test-subj="ResultSettingsQuerySampleResponse"
      />
      <EuiSpacer />
      <EuiCodeBlock language="json" whiteSpace="pre-wrap">
        {/* TODO No results messsage */}
        {/* TODO Query on load */}
        {response ? JSON.stringify(response, null, 2) : ''}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
