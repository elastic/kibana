/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiButton,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibanaServices } from '../../hooks/use_kibana';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { ELASTIC_MANAGED_WEB_CRAWLERS_PATH, BASE_WEB_CRAWLERS_PATH } from '../../constants';
import { DecorativeHorizontalStepper } from '../common/decorative_horizontal_stepper';

export const EmptyWebCrawlersPrompt: React.FC = () => {
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const assetBasePath = useAssetBasePath();
  const webCrawlersIcon = assetBasePath + '/web_crawlers.svg';
  const githubIcon = assetBasePath + '/github_white.svg';

  return (
    <EuiFlexGroup alignItems="center" direction="column">
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            gutterSize="l"
          >
            <EuiFlexItem>
              <EuiIcon size="xxl" type={webCrawlersIcon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.webCrawlersEmpty.title', {
                    defaultMessage: 'Set up a web crawler',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate('xpack.serverlessSearch.webCrawlersEmpty.description', {
                    defaultMessage:
                      "To set up and deploy a web crawler you'll be working between data source, your terminal, and the Kibana UI. The high level process looks like this:",
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup
              alignItems="stretch"
              justifyContent="center"
              direction="column"
              gutterSize="s"
            >
              <EuiFlexItem>
                <EuiPanel color="subdued">
                  <EuiFlexItem grow={false}>
                    <DecorativeHorizontalStepper stepCount={3} />
                  </EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexGroup
                          gutterSize="s"
                          direction="row"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <EuiFlexItem grow={false}>
                            <EuiIcon color="primary" size="l" type={webCrawlersIcon} />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiIcon size="m" type="sortRight" />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiIcon color="primary" size="l" type="launch" />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText>
                            <p>
                              <FormattedMessage
                                id="xpack.serverlessSearch.webCrawlersEmpty.guideTwoDescription"
                                defaultMessage="Deploy web crawler code on your own infrastructure by running from {source}, or using {docker}"
                                values={{
                                  source: (
                                    <EuiLink
                                      target="_blank"
                                      data-test-subj="serverlessSearchEmptyConnectorsPromptSourceLink"
                                      href={'https://github.com/elastic/crawler'}
                                    >
                                      {i18n.translate(
                                        'xpack.serverlessSearch.webCrawlersEmpty.sourceLabel',
                                        { defaultMessage: 'source' }
                                      )}
                                    </EuiLink>
                                  ),
                                  docker: (
                                    <EuiLink
                                      target="_blank"
                                      data-test-subj="serverlessSearchEmptyConnectorsPromptDockerLink"
                                      href={
                                        'https://github.com/elastic/crawler?tab=readme-ov-file#running-open-crawler-with-docker'
                                      }
                                    >
                                      {i18n.translate(
                                        'xpack.serverlessSearch.webCrawlersEmpty.dockerLabel',
                                        { defaultMessage: 'Docker' }
                                      )}
                                    </EuiLink>
                                  ),
                                }}
                              />
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            justifyContent="center"
                            alignItems="center"
                            direction="row"
                            gutterSize="s"
                          >
                            <EuiFlexItem grow={false}>
                              <EuiIcon color="primary" size="l" type="globe" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.webCrawlersEmpty.guideOneDescription',
                                {
                                  defaultMessage: 'Set one or more domain URLs you want to crawl',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            gutterSize="s"
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="globe" />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon size="m" type="sortRight" />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type={webCrawlersIcon} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon size="m" type="sortRight" />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="logoElasticsearch" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.webCrawlersEmpty.guideThreeDescription',
                                {
                                  defaultMessage:
                                    'Configure your web crawler and connect it to Elasticsearch',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup direction="row" gutterSize="m">
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="serverlessSearchEmptyConnectorsPromptCreateSelfManagedConnectorButton"
                  fill
                  iconType={githubIcon}
                  href={'https://github.com/elastic/crawler'}
                  target="_blank"
                >
                  {i18n.translate('xpack.serverlessSearch.webCrawlersEmpty.selfManagedButton', {
                    defaultMessage: 'Self-managed web crawler',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="serverlessSearchEmptyConnectorsPromptCreateElasticManagedConnectorButton"
                      onClick={() =>
                        navigateToUrl(
                          `${BASE_WEB_CRAWLERS_PATH}/${ELASTIC_MANAGED_WEB_CRAWLERS_PATH}`
                        )
                      }
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.webCrawlersEmpty.elasticManagedButton',
                        {
                          defaultMessage: 'Elastic managed web crawler',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="accent">Coming soon</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
