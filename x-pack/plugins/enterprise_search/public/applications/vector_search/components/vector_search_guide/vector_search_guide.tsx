/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import elserIllustration from '../../../../assets/images/elser.svg';
import nlpIllustration from '../../../../assets/images/nlp.svg';
import { SetVectorSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchVectorSearchPageTemplate } from '../layout/page_template';

const CREATE_INDEX_SNIPPET = `PUT /image-index
{
  "mappings": {
    "properties": {
      "image-vector": {
        "type": "dense_vector",
        "dims": 3,
        "index": true,
        "similarity": "l2_norm"
      },
      "title-vector": {
        "type": "dense_vector",
        "dims": 5,
        "index": true,
        "similarity": "l2_norm"
      },
      "title": {
        "type": "text"
      },
      "file-type": {
        "type": "keyword"
      }
    }
  }
}`;

const INGEST_SNIPPET = `POST /image-index/_bulk?refresh=true
{ "index": { "_id": "1" } }
{ "image-vector": [1, 5, -20], "title-vector": [12, 50, -10, 0, 1], "title": "moose family", "file-type": "jpg" }
{ "index": { "_id": "2" } }
{ "image-vector": [42, 8, -15], "title-vector": [25, 1, 4, -12, 2], "title": "alpine lake", "file-type": "png" }
{ "index": { "_id": "3" } }
{ "image-vector": [15, 11, 23], "title-vector": [1, 5, 25, 50, 20], "title": "full moon", "file-type": "jpg" }
...`;

const QUERY_SNIPPET = `POST /image-index/_search
{
  "knn": {
    "field": "image-vector",
    "query_vector": [-5, 9, -12],
    "k": 10,
    "num_candidates": 100
  },
  "fields": [ "title", "file-type" ]
}`;

export const VectorSearchGuide: React.FC = () => (
  <EnterpriseSearchVectorSearchPageTemplate
    restrictWidth
    pageHeader={{
      description: (
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.vectorSearch.guide.description"
            defaultMessage="Elasticsearch can be used as a vector database and search along with other semantic search methods."
          />
          <EuiLink>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.descriptionLink"
              defaultMessage="Learn more about vector searches."
            />
          </EuiLink>
        </p>
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
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.createIndex.description"
              defaultMessage="Start by creating an index with one or more {denseVector} fields."
              values={{ denseVector: <span>dense_vector</span> }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <EuiCodeBlock>{CREATE_INDEX_SNIPPET}</EuiCodeBlock>
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
              defaultMessage="Add data to your index to make it searchable."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <EuiCodeBlock>{INGEST_SNIPPET}</EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiHorizontalRule />
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={4}>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.query.title"
              defaultMessage="Build your vector search query"
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
        <EuiCodeBlock>{QUERY_SNIPPET}</EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiHorizontalRule />
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={4}>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.title"
              defaultMessage="Don’t have a model deployed?"
            />
          </h2>
        </EuiTitle>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.description"
              defaultMessage="Elastic can help you generate embeddings."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiCard
            href="#"
            target="_blank"
            layout="horizontal"
            titleSize="s"
            icon={<EuiIcon type={elserIllustration} size="xxl" />}
            title={
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.elser.title"
                defaultMessage="Elastic Learned Sparse Encoder (ELSER)"
              />
            }
            description={
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.elser.description"
                defaultMessage="Learn about the configuration-free semantic search"
              />
            }
          />
          <EuiCard
            href="https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-model-ref.html#ml-nlp-model-ref-text-embedding"
            target="_blank"
            layout="horizontal"
            titleSize="s"
            icon={<EuiIcon type={nlpIllustration} size="xxl" />}
            title={
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.byoModel.title"
                defaultMessage="Run your models in Elastic"
              />
            }
            description={
              <FormattedMessage
                id="xpack.enterpriseSearch.vectorSearch.guide.deployedModel.byoModel.description"
                defaultMessage="Learn how to load in compatible third-party models"
              />
            }
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EnterpriseSearchVectorSearchPageTemplate>
);
