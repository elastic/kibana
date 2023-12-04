/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiThemeProvider,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAssetBasePath } from '../hooks/use_asset_base_path';

export const PipelinePanel: React.FC = () => {
  const assetBasePath = useAssetBasePath();

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGroup direction="column" gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="cluster" src={`${assetBasePath}/cluster.svg`} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.serverlessSearch.pipeline.overview.dataEnrichment.title',
                      {
                        defaultMessage: 'Enrich Data',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.serverlessSearch.pipeline.overview.dataEnrichment.description',
                      {
                        defaultMessage:
                          'Add information from external sources or apply transformations to your documents for more contextual, insightful search.',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="cut" src={`${assetBasePath}/cut.svg`} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.serverlessSearch.pipeline.overview.extAndStandard.title',
                      {
                        defaultMessage: 'Extract and standardize',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.serverlessSearch.pipeline.overview.extAndStandard.description',
                    {
                      defaultMessage:
                        'Parse information from your documents to ensure they conform to a standardized format.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="reporter" src={`${assetBasePath}/reporter.svg`} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.serverlessSearch.pipeline.overview.anonymization.title',
                      {
                        defaultMessage: 'Anonymize data',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.serverlessSearch.pipeline.overview.anonymization.description',
                    {
                      defaultMessage:
                        'Remove sensitive information from documents before indexing.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
