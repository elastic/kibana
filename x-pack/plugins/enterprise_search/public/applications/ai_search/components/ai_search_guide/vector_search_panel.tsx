/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import {
  ML_MANAGE_TRAINED_MODELS_PATH,
  NEW_INDEX_PATH,
} from '../../../enterprise_search_content/routes';
import { docLinks } from '../../../shared/doc_links';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

const steps: EuiContainedStepProps[] = [
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step1.title', {
      defaultMessage: 'Learn how to upload ML models',
    }),
    children: (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiLink
            data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-trainedModelsLink"
            href={docLinks.trainedModels}
            target="_blank"
            external
          >
            {i18n.translate(
              'xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step1.guideToTrainedModelsLinkText',
              { defaultMessage: 'Guide to trained models' }
            )}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLinkTo
            data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-trainedModelsButton"
            to={generatePath(ML_MANAGE_TRAINED_MODELS_PATH)}
            shouldNotCreateHref
          >
            <EuiButton iconType="eye">
              {i18n.translate(
                'xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step1.buttonLabel',
                {
                  defaultMessage: 'View trained models',
                }
              )}
            </EuiButton>
          </EuiLinkTo>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step2.title', {
      defaultMessage: 'Create an index',
    }),
    children: (
      <EuiLinkTo
        to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_PATH)}
        shouldNotCreateHref
      >
        <EuiButton
          data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-createIndexButton"
          iconType="plusInCircle"
        >
          {i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step2.buttonLabel', {
            defaultMessage: 'Create an index',
          })}
        </EuiButton>
      </EuiLinkTo>
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step3.title', {
      defaultMessage: 'Create a ML inference pipeline',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step3.description"
            defaultMessage="Navigate to your index's {pipelinesName} tab to create an inference pipeline that uses your deployed model."
            values={{
              pipelinesName: (
                <strong>
                  &quot;
                  {i18n.translate(
                    'xpack.enterpriseSearch.aiSearch.vectorSearchPanel.step3.description.pipelinesName',
                    {
                      defaultMessage: 'Pipelines',
                    }
                  )}
                  &quot;
                </strong>
              ),
            }}
          />
        </p>
      </EuiText>
    ),
    status: 'incomplete',
  },
];

export const VectorSearchPanel: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.aiSearch.vectorSearchPanel.description"
              defaultMessage="Use {vectorDbCapabilities} by adding embeddings from your ML models. Deploy trained models on Elastic ML nodes and set up inference pipelines to automatically add embeddings when you ingest documents, so you can use the kNN vector search method in _search."
              values={{
                vectorDbCapabilities: (
                  <EuiLink
                    data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-knnSearchLink"
                    target="_blank"
                    href={docLinks.knnSearch}
                    external={false}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.aiSearch.vectorSearchPanel.description.vectorDbCapabilitiesLinkText',
                      {
                        defaultMessage: "Elasticsearch's vector DB capabilities",
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSteps steps={steps} titleSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
