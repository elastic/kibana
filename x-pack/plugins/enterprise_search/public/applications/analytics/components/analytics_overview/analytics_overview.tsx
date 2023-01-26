/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { COLLECTION_CREATION_PATH } from '../../routes';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionTable } from './analytics_collection_table';
import { AnalyticsCollectionsLogic } from './analytics_collections_logic';

export const AnalyticsOverview: React.FC = () => {
  const { fetchAnalyticsCollections } = useActions(AnalyticsCollectionsLogic);
  const { analyticsCollections, isLoading, hasNoAnalyticsCollections } =
    useValues(AnalyticsCollectionsLogic);

  useEffect(() => {
    fetchAnalyticsCollections();
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      pageChrome={[]}
      restrictWidth
      isLoading={isLoading}
      pageViewTelemetry="Analytics Collections Overview"
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.pageDescription',
          {
            defaultMessage:
              'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications. Track trends over time, identify and investigate anomalies, and make optimizations.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.analytics.collections.pageTitle', {
          defaultMessage: 'Behavioral Analytics',
        }),
      }}
    >
      {!hasNoAnalyticsCollections && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.enterpriseSearch.analytics.collections.headingTitle', {
                  defaultMessage: 'Collections',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonTo fill iconType="plusInCircle" to={COLLECTION_CREATION_PATH}>
              {i18n.translate('xpack.enterpriseSearch.analytics.collections.create.buttonTitle', {
                defaultMessage: 'Create new collection',
              })}
            </EuiButtonTo>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiSpacer size="l" />
      {hasNoAnalyticsCollections ? (
        <EuiEmptyPrompt
          iconType="search"
          title={
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.emptyState.headingTitle',
                {
                  defaultMessage: 'You dont have any collections yet',
                }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.emptyState.subHeading',
                {
                  defaultMessage:
                    'An analytics collection provides a place to store the analytics events for any given search application you are building. Create a new collection to get started.',
                }
              )}
            </p>
          }
          actions={[
            <EuiButtonTo fill iconType="plusInCircle" to={COLLECTION_CREATION_PATH}>
              {i18n.translate('xpack.enterpriseSearch.analytics.collections.create.buttonTitle', {
                defaultMessage: 'Create new collection',
              })}
            </EuiButtonTo>,
          ]}
        />
      ) : (
        <AnalyticsCollectionTable collections={analyticsCollections} isLoading={isLoading} />
      )}
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
