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

import { DEV_TOOLS_CONSOLE_PATH } from '../../../enterprise_search_content/routes';
import { docLinks } from '../../../shared/doc_links';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

const steps: EuiContainedStepProps[] = [
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step1.title', {
      defaultMessage: 'Discover examples of using RRF in _search queries',
    }),
    children: (
      <EuiLink
        data-telemetry-id="entSearch-aiSearch-rankAggregation-rrfRankingPanel-rrfDocsLink"
        href={docLinks.rrf}
        target="_blank"
        external
      >
        {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step1.rrfDocsLinkText', {
          defaultMessage: 'Reciprocal Rank Fusion documentation',
        })}
      </EuiLink>
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step2.title', {
      defaultMessage: 'Try it today in Console',
    }),
    children: (
      <EuiLinkTo
        data-telemetry-id="entSearch-aiSearch-rankAggregation-rrfRankingPanel-devToolsConsoleButton"
        to={generatePath(DEV_TOOLS_CONSOLE_PATH)}
        shouldNotCreateHref
      >
        <EuiButton>
          {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step2.buttonLabel', {
            defaultMessage: 'Open Console',
          })}
        </EuiButton>
      </EuiLinkTo>
    ),
    status: 'incomplete',
  },
];

export const RrfRankingPanel: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.aiSearch.rrfRankingPanel.description"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-rrfRankingPanel-rrfDocsLink"
              defaultMessage="Use {rrf} to combine rankings from multiple result sets with different relevance indicators, with no fine tuning required."
              values={{
                rrf: (
                  <EuiLink target="_blank" href={docLinks.rrf} external={false}>
                    {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.rrfLinkText', {
                      defaultMessage: 'Reciprocal Rank Fusion (RRF)',
                    })}
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
