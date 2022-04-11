/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import dedent from 'dedent';

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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { SEARCH_INDICES_PATH } from '../../../enterprise_search_content/routes';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import searchIndicesIllustration from './search_indices.svg';
import './add_content_empty_prompt.scss';

export const AddContentEmptyPrompt: React.FC = () => {
  return (
    <EuiPanel color="transparent" paddingSize="l">
      <EuiFlexGroup className="addContentEmptyPrompt" justifyContent="spaceBetween" direction="row">
        <EuiFlexItem grow>
          <EuiFlexGroup direction="column" responsive={false}>
            <EuiFlexItem grow>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.overview.emptyState.heading', {
                    defaultMessage: 'Add content to Enterprise Search',
                  })}
                </h2>
              </EuiTitle>
              <EuiSpacer size="l" />
              <EuiText grow={false}>
                <p>
                  {i18n.translate('xpack.enterpriseSearch.emptyState.description', {
                    defaultMessage: dedent`Data you add in Enterprise Search is called a Search index and
                            it's searchable in both App and Workplace Search. Now you can use your connectors in
                            App Search and your web crawlers in Workplace Search.`,
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" >
                <EuiFlexItem grow={false}>
                  <EuiLinkTo
                    to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + SEARCH_INDICES_PATH)}
                    shouldNotCreateHref
                  >
                    <EuiButton color="primary" fill>
                      {i18n.translate('xpack.enterpriseSearch.overview.emptyState.buttonTitle', {
                        defaultMessage: 'Add content to Enterprise Search',
                      })}
                    </EuiButton>
                  </EuiLinkTo>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLink href="#" target="_blank">
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
            size="l"
            float="right"
            src={searchIndicesIllustration}
            alt={i18n.translate('xpack.enterpriseSearch.overview.searchIndices.image.altText', {
              defaultMessage: 'Search indices illustration',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
