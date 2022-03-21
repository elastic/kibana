/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { ELASTICSEARCH_GUIDE_PATH } from '../../routes';
import { ElasticsearchResources } from '../elasticsearch_resources';

export const ElasticsearchCard: React.FC = () => {
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup gutterSize="xl" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText>
            <h3>
              <FormattedMessage
                id="xpack.enterpriseSearch.overview.elasticsearchCard.heading"
                defaultMessage="Get started with Elasticsearch"
              />
            </h3>
          </EuiText>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.enterpriseSearch.overview.elasticsearchCard.description"
              defaultMessage="Design and build performant, relevant search-powered application or large-scale search implementations directly in Elasticsearch"
            />
          </EuiText>
          <EuiButtonTo to={`${ELASTICSEARCH_GUIDE_PATH}`}>
            <FormattedMessage
              id="xpack.enterpriseSearch.overview.elasticsearchCard.button"
              defaultMessage="Get Started"
            />
          </EuiButtonTo>
        </EuiFlexItem>
        <EuiFlexItem>
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
