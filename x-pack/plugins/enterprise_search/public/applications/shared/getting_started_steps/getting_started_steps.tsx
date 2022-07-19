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
                { defaultMessage: 'Select or create an Elasticsearch index' }
              ),
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.addData.message',
                        {
                          defaultMessage:
                            'Get started by adding your data to Enterprise Search. You can use the Elastic Web Crawler, API endpoints, existing Elasticsearch indices , or third-party connectors like Google Drive, Microsoft Sharepoint and more.',
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
                { defaultMessage: 'Assign your index to an App Search engine' }
              ),
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.gettingStartedSteps.buildSearchExperience.message',
                        {
                          defaultMessage:
                            'You can use search engines to build customizable search experiences for your customers with App Search.',
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
                { defaultMessage: 'Build a client-side search experience with Search UI' }
              ),
              children: (
                <EuiText color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.overview.gettingStartedSteps.tuneSearchExperience.message',
                      {
                        defaultMessage:
                          'Take full control over your client-side search experience by building with the Search UI library. Connect directly to App Search or Elasticsearch.',
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
