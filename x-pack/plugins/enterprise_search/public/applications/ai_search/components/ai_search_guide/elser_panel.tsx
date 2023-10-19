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
import { NEW_INDEX_PATH } from '../../../enterprise_search_content/routes';
import { docLinks } from '../../../shared/doc_links';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

const steps: EuiContainedStepProps[] = [
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.step1.title', {
      defaultMessage: 'Create an index',
    }),
    children: (
      <EuiLinkTo
        to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_PATH)}
        shouldNotCreateHref
      >
        <EuiButton
          data-telemetry-id="entSearch-aiSearch-semanticSearch-elserPanel-createIndexButton"
          iconType="plusInCircle"
        >
          {i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.step1.buttonLabel', {
            defaultMessage: 'Create an index',
          })}
        </EuiButton>
      </EuiLinkTo>
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.step2.title', {
      defaultMessage: "Navigate to index's Pipelines tab",
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.aiSearch.elserPanel.step2.description"
            defaultMessage="After creating an index, select it and click the tab called {pipelinesName}."
            values={{
              pipelinesName: (
                <strong>
                  &quot;
                  {i18n.translate(
                    'xpack.enterpriseSearch.aiSearch.elserPanel.step2.description.pipelinesName',
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
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.step3.title', {
      defaultMessage: 'Follow the on-screen instructions to deploy ELSER',
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.aiSearch.elserPanel.step3.description"
            defaultMessage="Locate the panel that allows you to one click deploy ELSER and create an inference pipeline using that model."
          />
        </p>
      </EuiText>
    ),
    status: 'incomplete',
  },
];

export const ElserPanel: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.aiSearch.elser.description"
              defaultMessage="Effortlessly deploy the {elser} for instant text semantic search capabilities in just a few clicks. This model expands your document and query text using the 'text_expansion' field, delivering seamless search out of the box."
              values={{
                elser: (
                  <EuiLink target="_blank" href={docLinks.elser} external={false}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.aiSearch.elser.description.elserLinkText',
                      {
                        defaultMessage: 'Elastic Learned Sparse Encoder v2',
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
