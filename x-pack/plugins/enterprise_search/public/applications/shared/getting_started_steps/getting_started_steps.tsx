/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ELASTICSEARCH_GUIDE_PATH } from '../../enterprise_search_overview/routes';

import { EuiLinkTo } from '../react_router_helpers';

import { IconRow } from './icon_row';

export const GettingStartedSteps: React.FC = () => {
  // TODO replace with logic file
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
              status: 'current',
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
                      <EuiPopover
                        button={
                          <EuiButton
                            iconType="arrowDown"
                            iconSide="right"
                            fill
                            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.overview.gettingStartedSteps.createASearchEngineButton',
                              { defaultMessage: 'Create a search engine' }
                            )}
                          </EuiButton>
                        }
                        isOpen={isPopoverOpen}
                        closePopover={() => setIsPopoverOpen(false)}
                      >
                        {/* TODO add onclick for these links*/}
                        <EuiContextMenuPanel
                          items={[
                            <EuiContextMenuItem key="" onClick={() => {}}>
                              <EuiText size="s">
                                <h4>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.overview.gettingStartedSteps.createAppSearchEngine.title',
                                    { defaultMessage: 'Create an App Search engine' }
                                  )}
                                </h4>
                                {i18n.translate(
                                  'xpack.enterpriseSearch.overview.gettingStartedSteps.createAppSearchEngine.description',
                                  {
                                    defaultMessage:
                                      'All the power of Elasticsearch, without the learning curve.',
                                  }
                                )}
                              </EuiText>
                            </EuiContextMenuItem>,
                            <EuiContextMenuItem key="" onClick={() => {}}>
                              <EuiText size="s">
                                <h4>
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.overview.gettingStartedSteps.createWorkplaceSearchGroup.title',
                                    { defaultMessage: 'Create a Workplace Search group' }
                                  )}
                                </h4>
                                {i18n.translate(
                                  'xpack.enterpriseSearch.overview.gettingStartedSteps.createWorkplaceSearchGroup.description',
                                  {
                                    defaultMessage: 'A secure search experience for internal teams',
                                  }
                                )}
                              </EuiText>
                            </EuiContextMenuItem>,
                          ]}
                        />
                      </EuiPopover>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiLinkTo to={ELASTICSEARCH_GUIDE_PATH}>
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
              status: 'incomplete',
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
