/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import {
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../common/constants';
import welcomeGraphicDark from '../../../assets/images/welcome_dark.svg';
import welcomeGraphicLight from '../../../assets/images/welcome_light.svg';
import { NEW_INDEX_PATH } from '../../enterprise_search_content/routes';
import { docLinks } from '../doc_links';
import { EuiLinkTo } from '../react_router_helpers';

import './add_content_empty_prompt.scss';

interface EmptyPromptProps {
  title?: string;
  buttonLabel?: string;
}

export const AddContentEmptyPrompt: React.FC<EmptyPromptProps> = ({ title, buttonLabel }) => {
  const { colorMode } = useEuiTheme();

  return (
    <EuiPanel color="transparent" paddingSize="none">
      <EuiFlexGroup className="addContentEmptyPrompt" justifyContent="spaceBetween" direction="row">
        <EuiFlexItem grow>
          <EuiFlexGroup direction="column" responsive={false}>
            <EuiFlexItem grow>
              <EuiTitle>
                <h2>
                  {title ||
                    i18n.translate('xpack.enterpriseSearch.overview.emptyState.heading', {
                      defaultMessage: 'Add content to Enterprise Search',
                    })}
                </h2>
              </EuiTitle>
              <EuiSpacer size="l" />
              <EuiText grow={false}>
                <p>
                  {i18n.translate('xpack.enterpriseSearch.emptyState.description', {
                    defaultMessage:
                      'Your content is stored in an Elasticsearch index. Get started by creating an Elasticsearch index and selecting an ingestion method. Options include the Elastic web crawler, third party data integrations, or using Elasticsearch API endpoints.',
                  })}
                </p>
                <p>
                  {i18n.translate('xpack.enterpriseSearch.emptyState.description.line2', {
                    defaultMessage:
                      "Whether you're building a search experience with App Search or Elasticsearch, you can now get started here.",
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLinkTo
                    to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_PATH)}
                    shouldNotCreateHref
                  >
                    <EuiButton color="primary" fill>
                      {buttonLabel ||
                        i18n.translate('xpack.enterpriseSearch.overview.emptyState.buttonTitle', {
                          defaultMessage: 'Add content to Enterprise Search',
                        })}
                    </EuiButton>
                  </EuiLinkTo>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLink href={docLinks.start} target="_blank">
                    {i18n.translate('xpack.enterpriseSearch.overview.emptyState.footerLinkTitle', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiImage
            size="xl"
            float="right"
            src={colorMode === 'LIGHT' ? welcomeGraphicLight : welcomeGraphicDark}
            alt={i18n.translate('xpack.enterpriseSearch.overview.searchIndices.image.altText', {
              defaultMessage: 'Search indices illustration',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
