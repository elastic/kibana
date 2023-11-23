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
  EuiLink,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LEARN_MORE_LABEL } from '../constants';

export interface PipelinePanelProps {
  assetBasePath: string;
  docLinks: { elasticsearchClients: string; };
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({
  assetBasePath,
  docLinks,
}) => {

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiImage
              alt="cluster"
              src={`${assetBasePath}/cluster.svg`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.serverlessSearch.pipeline.overview.dataEnrichment.title', {
                  defaultMessage: 'Data enrichment',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.serverlessSearch.pipeline.overview.dataEnrichment.description', {
                  defaultMessage:
                    'Add information from external sources or apply transformations to your documents for more contextual, insightful search.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <EuiLink href={docLinks.elasticsearchClients} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiImage
              alt="cut"
              src={`${assetBasePath}/cut.svg`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.serverlessSearch.pipeline.overview.extAndStandard.title', {
                  defaultMessage: 'Extraction and standardization',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.pipeline.overview.extAndStandard.description', {
                defaultMessage:
                  'Parse information from your documents to ensure they conform to a standardized format.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiImage
              alt="reporter"
              src={`${assetBasePath}/reporter.svg`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.serverlessSearch.pipeline.overview.anonymization.title', {
                  defaultMessage: 'Anonymization',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.pipeline.overview.anonymization.description', {
                defaultMessage:
                  'Remove sensitive information from documents before indexing.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};