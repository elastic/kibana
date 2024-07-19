/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useSearchParams } from 'react-router-dom-v5-compat';

import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { SetAISearchChromeSearchDocsSection } from '../../../ai_search/components/ai_search_guide/ai_search_docs_section';
import { docLinks } from '../../../shared/doc_links';
import { SetVectorSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { DevToolsConsoleCodeBlock } from '../../../vector_search/components/dev_tools_console_code_block/dev_tools_console_code_block';
import { EnterpriseSearchVectorSearchPageTemplate } from '../../../vector_search/components/layout/page_template';

const SETUP_INFERENCE_ENDPOINT_ELSER = `PUT _inference/sparse_embedding/my-inference-endpoint
{
  "service": "elser",
  "service_settings": {
    "num_allocations": 1,
    "num_threads": 1
  }
}
`;

const SETUP_INFERENCE_ENDPOINT_E5 = `PUT _inference/sparse_embedding/my-inference-endpoint
{
  "service": "elasticsearch",
  "service_settings": {
    "model_id": ".multilingual-e5-small",
    "num_allocations": 1,
    "num_threads": 1
  }
}
`;

const SETUP_INFERENCE_ENDPOINT_OPENAI = `PUT _inference/text_embedding/my-inference-endpoint
{
  "service": "openai",
  "service_settings": {
    "model_id": "text-embedding-3-small",
    "api_key": "<api_key>",
  }
}
`;

const SETUP_INFERENCE_ENDPOINT_BEDROCK = `PUT _inference/text_embedding/my-inference-endpoint
{
  "service": "amazonbedrock",
  "service_settings": {
    "access_key": "<aws_access_key>",
    "secret_key": "<aws_secret_key>",
    "region": "us-east-1",
    "provider": "amazontitan",
    "model": "amazon.titan-embed-text-v2:0"
  }
}
`;

const CREATE_INDEX_SNIPPET = `PUT /my-index
{
  "mappings": {
    "properties": {
      "text": {
        "type": "semantic_text",
        "inference_id": "my-inference-endpoint"
      }
    }
  }
}`;

const INGEST_SNIPPET = `POST /my-index/_doc
{ 
  "text": "There are a few foods and food groups that will help to fight inflammation and delayed onset muscle soreness (both things that are inevitable after a long, hard workout) when you incorporate them into your postworkout eats, whether immediately after your run or at a meal later in the day" 
}`;

const QUERY_SNIPPET = `POST /my-index/_search
{
  "size" : 3,
  "query" : {
    "semantic": {
      "field": "text", 
      "query": "How to avoid muscle soreness while running?" 
    }
  }
}`;

interface SelectModelPanelProps {
  isSelectedModel: boolean;
  model: InferenceModel;
  setSelectedModel: (model: InferenceModel) => void;
}

interface InferenceModel {
  code: string;
  id: string;
  modelName: string;
}

const SelectModelPanel: React.FC<SelectModelPanelProps> = ({
  model,
  setSelectedModel,
  isSelectedModel,
}) => {
  return (
    <EuiFlexGroup gutterSize="xs" direction="row">
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          borderRadius="m"
          onClick={() => setSelectedModel(model)}
          color={isSelectedModel ? 'primary' : 'plain'}
        >
          <EuiFlexGroup direction="column" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiText textAlign="center">
                <h4>{model.modelName}</h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SemanticSearchGuide: React.FC = () => {
  const modelSelection: InferenceModel[] = [
    { id: 'elser', modelName: 'ELSER', code: SETUP_INFERENCE_ENDPOINT_ELSER },
    { id: 'e5', modelName: 'E5', code: SETUP_INFERENCE_ENDPOINT_E5 },
    {
      code: SETUP_INFERENCE_ENDPOINT_OPENAI,
      id: 'openai',
      modelName: 'OpenAI',
    },
    {
      id: 'bedrock',
      modelName: 'Amazon Bedrock',
      code: SETUP_INFERENCE_ENDPOINT_BEDROCK,
    },
  ];
  const [searchParams] = useSearchParams();
  const chosenUrlModel =
    modelSelection.find((model) => model.id === searchParams.get('model_example')) ||
    modelSelection[0];
  const [selectedModel, setSelectedModel] = React.useState<InferenceModel>(chosenUrlModel);

  return (
    <EnterpriseSearchVectorSearchPageTemplate
      restrictWidth
      pageHeader={{
        description: (
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.semanticSearch.guide.description"
              defaultMessage="Semantic search in Elasticsearch is now simpler and more intuitive when you use inference endpoints and the `semantic_text` field type."
            />{' '}
            <EuiLink
              href={docLinks.knnSearch}
              target="_blank"
              data-test-subj="vector-search-documentation-link"
            >
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.descriptionLink"
                defaultMessage="Learn more about semantic_text."
              />
            </EuiLink>
          </p>
        ),
        pageTitle: (
          <FormattedMessage
            id="xpack.enterpriseSearch.semanticSearch.guide.pageTitle"
            defaultMessage="Get started with semantic search"
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
                id="xpack.enterpriseSearch.semanticSearch.guide.setupInferenceEndpoint.title"
                defaultMessage="Set up an inference endpoint"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.setupInferenceEndpoint.description"
                defaultMessage="Start by setting up an inference endpoint to manage the machine learning model for your task. This may take a while to complete depending on the model you choose and your ML node configuration."
                values={{ semanticText: <EuiCode>semantic_text</EuiCode> }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            {modelSelection.map((model) => (
              <SelectModelPanel
                model={model}
                setSelectedModel={setSelectedModel}
                isSelectedModel={selectedModel === model}
              />
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <DevToolsConsoleCodeBlock>{selectedModel.code}</DevToolsConsoleCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.createIndex.title"
                defaultMessage="Create an index"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.createIndex.description"
                defaultMessage="Start by creating an index with one or more {semanticText} fields."
                values={{ semanticText: <EuiCode>semantic_text</EuiCode> }}
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
                id="xpack.enterpriseSearch.semanticSearch.guide.ingest.title"
                defaultMessage="Ingest your data"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.ingest.description"
                defaultMessage="Add data to Elasticsearch using the field name you assigned the semantic_text type to."
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
                id="xpack.enterpriseSearch.semanticSearch.guide.query.title"
                defaultMessage="Perform semantic search"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.semanticSearch.guide.query.description"
                defaultMessage="Search your data by targeting the semantic_text field with a semantic query."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <DevToolsConsoleCodeBlock>{QUERY_SNIPPET}</DevToolsConsoleCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <SetAISearchChromeSearchDocsSection />
    </EnterpriseSearchVectorSearchPageTemplate>
  );
};
