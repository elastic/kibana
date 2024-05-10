/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import { IndexContent } from '@kbn/index-management';

const IndexMappingsDocsLink: FunctionComponent<{ docLinks: CoreStart['docLinks'] }> = ({
  docLinks,
}) => {
  return (
    <EuiPanel grow={false} paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="iInCircle" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.serverlessSearch.indexMappings.ingestPipelinesDocs.title"
                defaultMessage="Transform your searchable content"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.serverlessSearch.indexMappings.ingestPipelinesDocs.description"
            defaultMessage="Want to add custom fields, or use trained ML models to analyze and enrich your
          indexed documents? Use index-specific ingest pipelines to customize documents to your needs."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiLink
        data-test-subj="serverlessSearchIndexMappingsDocsLinkLearnMoreAboutIngestPipelinesLink"
        href={docLinks.links.enterpriseSearch.ingestPipelines}
        target="_blank"
        external
      >
        <FormattedMessage
          id="xpack.serverlessSearch.indexMappings.ingestPipelinesDocs.linkLabel"
          defaultMessage="Learn more about ingest pipelines"
        />
      </EuiLink>
    </EuiPanel>
  );
};

export const createIndexMappingsDocsLinkContent = (core: CoreStart): IndexContent => {
  return {
    renderContent: () => <IndexMappingsDocsLink docLinks={core.docLinks} />,
  };
};
