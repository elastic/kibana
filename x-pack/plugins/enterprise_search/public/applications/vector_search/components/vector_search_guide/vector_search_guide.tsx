/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiCard,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { SEMANTIC_SEARCH_PLUGIN } from '../../../../../common/constants';
import elserIllustration from '../../../../assets/images/elser.svg';
import nlpIllustration from '../../../../assets/images/nlp.svg';
import { docLinks } from '../../../shared/doc_links';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { SetVectorSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { DevToolsConsoleCodeBlock } from '../dev_tools_console_code_block/dev_tools_console_code_block';
import { EnterpriseSearchVectorSearchPageTemplate } from '../layout/page_template';

const CREATE_INDEX_SNIPPET = `PUT /my-index
{
  "mappings": {
    "properties": {
      "vector": {
        "type": "dense_vector",
        "dims": 3
      },
      "text": {
        "type": "text"
      }
    }
  }
}`;

const INGEST_SNIPPET = `POST /my-index/_doc
{
  "vector": [1, 5, -20],
  "text": "hello world"
}`;

const QUERY_SNIPPET = `POST /my-index/_search
{
  "size" : 3,
  "query" : {
    "knn": {
      "field": "vector",
      "query_vector": [1, 5, -20]
    }
  }
}`;

export const VectorSearchGuide: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const { application } = useValues(KibanaLogic);

  return (
    <EnterpriseSearchVectorSearchPageTemplate
      restrictWidth
      pageHeader={{
        description: (
          <>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.description"
              defaultMessage="Elasticsearch can be used as a vector database, which enables vector search and semantic search use cases."
            />{' '}
            <EuiLink
              href={docLinks.knnSearch}
              target="_blank"
              data-test-subj="vector-search-documentation-link"
            >
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.descriptionLink"
                defaultMessage="Learn more about vector search."
              />
            </EuiLink>
          </>
        ),
        pageTitle: (
          <FormattedMessage
            id="xpack.enterpriseSearch.vectorSearch.guide.pageTitle"
            defaultMessage="Get started with vector search"
          />
        ),
      }}
    >
      <SetPageChrome />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.createIndex.title"
                defaultMessage="Create an index"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.createIndex.description"
                defaultMessage="Start by creating an index with one or more {denseVector} fields."
                values={{ denseVector: <EuiCode>dense_vector</EuiCode> }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <DevToolsConsoleCodeBlock>{CREATE_INDEX_SNIPPET}</DevToolsConsoleCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.ingest.title"
                defaultMessage="Ingest your data"
              />
            </h2>
          </EuiTitle>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.ingest.description"
                defaultMessage="Add data to Elasticsearch."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <DevToolsConsoleCodeBlock>{INGEST_SNIPPET}</DevToolsConsoleCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.query.title"
                defaultMessage="Perform vector search"
              />
            </h2>
          </EuiTitle>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.query.description"
                defaultMessage="Now you're ready to explore your data with searches and aggregations."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <DevToolsConsoleCodeBlock>{QUERY_SNIPPET}</DevToolsConsoleCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.title"
                defaultMessage="Want to use semantic search?"
              />
            </h2>
          </EuiTitle>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.description"
                defaultMessage="Deploy ML models easily with Elastic Inference Endpoints to generate embeddings for your documents."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <EuiFlexGroup gutterSize="l" direction="column">
            <EuiCard
              onClick={() => {
                application.navigateToUrl(
                  http.basePath.prepend(`${SEMANTIC_SEARCH_PLUGIN.URL}?model_example=elser`)
                );
              }}
              layout="horizontal"
              titleSize="s"
              icon={<EuiIcon type={elserIllustration} size="xxl" />}
              title={
                <FormattedMessage
                  id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.elser.title"
                  defaultMessage="ELSER"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.elser.description"
                  defaultMessage="Learn about our model that enables semantic search without configuration"
                />
              }
            />

            <EuiCard
              onClick={() => {
                application.navigateToUrl(
                  http.basePath.prepend(`${SEMANTIC_SEARCH_PLUGIN.URL}?model_example=e5`)
                );
              }}
              layout="horizontal"
              titleSize="s"
              icon={<EuiIcon type={nlpIllustration} size="xxl" />}
              title={
                <FormattedMessage
                  id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.byoModel.title"
                  defaultMessage="E5 Multilingual"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.byoModel.description"
                  defaultMessage="Use E5 to enable semantic search for multiple languages"
                />
              }
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchVectorSearchPageTemplate>
  );
};
