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
  EuiBadge,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibanaServices } from '../../hooks/use_kibana';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { BACK_LABEL } from '../../../../common/i18n_string';
import { DecorativeHorizontalStepper } from '../common/decorative_horizontal_stepper';

export const ElasticManagedWebCrawlersCommingSoon: React.FC = () => {
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const assetBasePath = useAssetBasePath();
  const webCrawlerIcon = assetBasePath + '/web_crawlers.svg';

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
              <EuiButtonEmpty
                data-test-subj="serverlessSearchElasticManagedWebCrawlerEmptyBackButton"
                iconType="arrowLeft"
                onClick={() => navigateToUrl(`./`)}
              >
                {BACK_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiIcon size="xxl" type={webCrawlerIcon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.title', {
                    defaultMessage: 'Elastic managed web crawlers',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiBadge color="accent">Coming soon</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.description',
                    {
                      defaultMessage:
                        "We're actively developing Elastic managed web crawlers, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
                    }
                  )}
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
                    <DecorativeHorizontalStepper stepCount={2} />
                  </EuiFlexItem>
                  <EuiFlexGroup>
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
                                'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.guideOneDescription',
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
                              <EuiIcon color="primary" size="l" type={webCrawlerIcon} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="logoElastic" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.guideThreeDescription',
                                {
                                  defaultMessage:
                                    'Configure all the web crawler process using Kibana',
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
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
