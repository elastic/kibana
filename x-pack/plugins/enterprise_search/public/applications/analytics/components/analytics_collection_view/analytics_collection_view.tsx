/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { COLLECTION_CREATION_PATH, COLLECTION_VIEW_PATH } from '../../routes';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionEvents } from './analytics_collection_events';
import { AnalyticsCollectionIntegrate } from './analytics_collection_integrate/analytics_collection_integrate';
import { AnalyticsCollectionSettings } from './analytics_collection_settings';

import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

export const collectionViewBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.breadcrumb', {
    defaultMessage: 'View collection',
  }),
];

export const AnalyticsCollectionView: React.FC = () => {
  const { fetchAnalyticsCollection } = useActions(FetchAnalyticsCollectionLogic);
  const { analyticsCollection, isLoading } = useValues(FetchAnalyticsCollectionLogic);
  const { id, section } = useParams<{ id: string; section: string }>();
  const { navigateToUrl } = useValues(KibanaLogic);
  const collectionViewTabs = [
    {
      id: 'events',
      label: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.tabs.eventsName', {
        defaultMessage: 'Events',
      }),
      onClick: () =>
        navigateToUrl(
          generateEncodedPath(COLLECTION_VIEW_PATH, {
            id: analyticsCollection?.id,
            section: 'events',
          })
        ),
      isSelected: section === 'events',
    },
    {
      id: 'integrate',
      label: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.tabs.integrateName', {
        defaultMessage: 'Integrate',
      }),
      onClick: () =>
        navigateToUrl(
          generateEncodedPath(COLLECTION_VIEW_PATH, {
            id: analyticsCollection?.id,
            section: 'integrate',
          })
        ),
      isSelected: section === 'integrate',
    },
    {
      id: 'settings',
      label: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.tabs.settingsName', {
        defaultMessage: 'Settings',
      }),
      onClick: () =>
        navigateToUrl(
          generateEncodedPath(COLLECTION_VIEW_PATH, {
            id: analyticsCollection?.id,
            section: 'settings',
          })
        ),
      isSelected: section === 'settings',
    },
  ];

  useEffect(() => {
    fetchAnalyticsCollection(id);
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      isLoading={isLoading}
      pageChrome={[...collectionViewBreadcrumbs]}
      pageViewTelemetry={`View Analytics Collection - ${section}`}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsView.pageDescription',
          {
            defaultMessage:
              'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications. Track trends over time, identify and investigate anomalies, and make optimizations.',
          }
        ),
        pageTitle: analyticsCollection?.name,
        tabs: [...collectionViewTabs],
      }}
    >
      {!analyticsCollection && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.analytics.collections.collectionsView.headingTitle',
                  {
                    defaultMessage: 'Collections',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonTo fill iconType="plusInCircle" to={COLLECTION_CREATION_PATH}>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.create.buttonTitle',
                {
                  defaultMessage: 'Create new collection',
                }
              )}
            </EuiButtonTo>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiSpacer size="l" />
      {analyticsCollection ? (
        <>
          {section === 'settings' && (
            <AnalyticsCollectionSettings collection={analyticsCollection} />
          )}
          {section === 'integrate' && (
            <AnalyticsCollectionIntegrate collection={analyticsCollection} />
          )}
          {section === 'events' && <AnalyticsCollectionEvents collection={analyticsCollection} />}
        </>
      ) : (
        <EuiEmptyPrompt
          iconType="search"
          title={
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.collectionNotFoundState.headingTitle',
                {
                  defaultMessage: 'You may have deleted this analytics collection',
                }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.collectionNotFoundState.subHeading',
                {
                  defaultMessage:
                    'An analytics collection provides a place to store the analytics events for any given search application you are building. Create a new collection to get started.',
                }
              )}
            </p>
          }
          actions={[
            <EuiButtonTo fill iconType="plusInCircle" to={COLLECTION_CREATION_PATH}>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.create.buttonTitle',
                {
                  defaultMessage: 'Create new collection',
                }
              )}
            </EuiButtonTo>,
          ]}
        />
      )}
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
