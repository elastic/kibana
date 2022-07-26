/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ELASTICSEARCH_PLUGIN } from '../../../../common/constants';

import { EuiLinkTo } from '../react_router_helpers';

import { IconRow } from './icon_row';

export interface GettingStartedStepsProps {
  step?: 'first' | 'second';
}

export const GettingStartedSteps: React.FC<GettingStartedStepsProps> = ({ step = 'first' }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSteps
          steps={[
            {
              title: i18n.translate(
                'xpack.enterpriseSearch.overview.gettingStartedSteps.addData.title',
                { defaultMessage: 'Add your documents to Enterprise Search' }
              ),
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.addData.message',
                        {
                          defaultMessage:
                            'Add your data to Enterprise Search. You can crawl website content with the Elastic web crawler, connect your existing application with Elasticsearch API endpoints, or use connectors to directly add third party content from providers like Google Drive, Microsoft Sharepoint and more.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <IconRow />
                </>
              ),
              status: (step === 'first' && 'current') || 'complete',
            },
            {
              title: i18n.translate(
                'xpack.enterpriseSearch.overview.gettingStartedSteps.buildSearchExperience.title',
                { defaultMessage: 'Build a search experience' }
              ),
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.buildSearchExperience.message',
                        {
                          defaultMessage:
                            'Create a search engine with App Search for a prebuild set of search management tools, or deeply customize your own tools by searching directly against Elasticsearch. Then build beautiful client-side search experiences with Search UI - available for Elasticsearch, App Search, and Workplace Search.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiLinkTo shouldNotCreateHref to={ELASTICSEARCH_PLUGIN.URL}>
                        <EuiIcon type="iInCircle" />
                        &nbsp;
                        {i18n.translate(
                          'xpack.enterpriseSearch.overview.gettingStartedSteps.searchWithElasticsearchLink',
                          { defaultMessage: 'Search with the Elasticsearch API' }
                        )}
                      </EuiLinkTo>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              ),
              status: (step === 'second' && 'current') || 'incomplete',
            },
            {
              title: i18n.translate(
                'xpack.enterpriseSearch.overview.gettingStartedSteps.tuneSearchExperience.title',
                { defaultMessage: 'Tune your search relevance' }
              ),
              children: (
                <EuiText color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.overview.gettingStartedSteps.tuneSearchExperience.message',
                      {
                        defaultMessage:
                          "Refine your search results by adjusting your search settings, including weighting certain fields or creating curations and synonyms. Then implement, measure, and dive into analytics to continue helping your users find exactly what they're looking for.",
                      }
                    )}
                  </p>
                </EuiText>
              ),
              status: 'incomplete',
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
