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
                { defaultMessage: 'Add your documents and data to Enterprise Search' }
              ),
              children: (
                <>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.addData.message',
                        {
                          defaultMessage:
                            'Get started by adding your data to Enterprise Search. You can use the Elastic Web Crawler, API endpoints, existing Elasticsearch indices or third party connectors like Google Drive, Microsoft Sharepoint and more.',
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
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.buildSearchExperience.message',
                        {
                          defaultMessage:
                            'You can use Search Engines to build customized search experiences for your customers or internal teams with App Search or Workplace Search. Or you can use Search UI to connect directly to an Elasticsearch index to build client-side search experinces for your users.',
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
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.overview.gettingStartedSteps.tuneSearchExperience.message',
                      {
                        defaultMessage:
                          "Dive into analytics and tune the result settings to help your users find exactly what they're looking for",
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
