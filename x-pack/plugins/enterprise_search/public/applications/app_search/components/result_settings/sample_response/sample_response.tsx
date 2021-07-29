/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

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

import { QueryPerformance } from '../query_performance';
import { ResultSettingsLogic } from '../result_settings_logic';

import { SampleResponseLogic } from './sample_response_logic';

export const SampleResponse: React.FC = () => {
  const { reducedServerResultFields } = useValues(ResultSettingsLogic);

  const { query, response } = useValues(SampleResponseLogic);
  const { queryChanged, getSearchResults } = useActions(SampleResponseLogic);

  useEffect(() => {
    getSearchResults(query, reducedServerResultFields);
  }, [query, reducedServerResultFields]);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponseTitle',
                { defaultMessage: 'Sample response' }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <QueryPerformance />
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
      {!!response && (
        <EuiCodeBlock language="json" whiteSpace="pre-wrap">
          {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
        </EuiCodeBlock>
      )}
    </EuiPanel>
  );
};
