/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';

import { DocumentsLogic } from './documents_logic';
import { IndexNameLogic } from './index_name_logic';

export const SearchIndexIndexMappings: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { makeMappingRequest } = useActions(DocumentsLogic);
  const { mappingData } = useValues(DocumentsLogic);

  useEffect(() => {
    makeMappingRequest({ indexName });
  }, [indexName]);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiCodeBlock language="json" isCopyable>
            {JSON.stringify(mappingData, null, 2)}
          </EuiCodeBlock>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.title', {
                      defaultMessage: 'About index mappings',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.searchIndex.mappings.description"
                  defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type (such as {keyword}, {number}, or {date}) and additional subfields. These index mappings determine the functions available in your relevance tuning and search experience."
                  values={{
                    keyword: <EuiCode>keyword</EuiCode>,
                    number: <EuiCode>number</EuiCode>,
                    date: <EuiCode>date</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.elasticsearchMapping} target="_blank" external>
              {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.docLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.transform.title', {
                      defaultMessage: 'Transform your searchable content',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.searchIndex.transform.description"
                  defaultMessage="Want to add custom fields, or use trained ML models to analyze and enrich your indexed documents? Use index-specific ingest pipelines to customize documents to your needs."
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.ingestPipelines} target="_blank" external>
              {i18n.translate('xpack.enterpriseSearch.content.searchIndex.transform.docLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
