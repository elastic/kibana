/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { ELASTICSEARCH_GUIDE_PATH } from '../../routes';
import { ElasticsearchResources } from '../elasticsearch_resources';

export const ElasticsearchCard: React.FC = () => {
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup gutterSize="xl" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchCard.heading', {
                defaultMessage: 'Get started with Elasticsearch',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchCard.description', {
              defaultMessage:
                'Design and build performant, relevant search-powered application or large-scale search implementations directly in Elasticsearch',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSpacer size="xs" />
          {/* div is needed to prevent button from stretching */}
          <div>
            <EuiButtonTo to={`${ELASTICSEARCH_GUIDE_PATH}`}>
              {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchCard.button', {
                defaultMessage: 'Get Started',
              })}
            </EuiButtonTo>
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
