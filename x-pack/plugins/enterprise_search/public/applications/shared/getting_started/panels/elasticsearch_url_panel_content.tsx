/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiSplitPanel, EuiText, EuiThemeProvider, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';

interface ElasticsearchUrlPanelContent {
  cloudId?: string;
  url?: string;
}

export const ElasticsearchUrlPanelContent: React.FC<ElasticsearchUrlPanelContent> = ({
  cloudId,
  url = ELASTICSEARCH_URL_PLACEHOLDER,
}) => {
  return (
    <EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate(
              'xpack.enterpriseSearch.content.overview.gettingStarted.cloudId.elasticTitle',
              {
                defaultMessage: 'Store your Elasticsearch URL',
              }
            )}
          </h5>
        </EuiTitle>
        <EuiText>
          {i18n.translate('xpack.enterpriseSearch.content.overview.gettingStarted.cloudId.desc', {
            defaultMessage: 'Unique identifier for your deployment. ',
          })}
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiThemeProvider colorMode="dark">
        <EuiSplitPanel.Inner paddingSize="none">
          <EuiCodeBlock
            isCopyable
            fontSize="m"
            // Code block isn't respecting overflow in only this situation
            css={css`
              overflow-wrap: anywhere;
            `}
          >
            {cloudId
              ? dedent`{
                    CloudID: "${cloudId}",
                    Url: "${url}",
                  }`
              : url}
          </EuiCodeBlock>
        </EuiSplitPanel.Inner>
      </EuiThemeProvider>
    </EuiSplitPanel.Outer>
  );
};
