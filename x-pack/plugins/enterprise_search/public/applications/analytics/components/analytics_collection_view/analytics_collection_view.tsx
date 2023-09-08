/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useMountedLogic, useValues } from 'kea';

import { EuiEmptyPrompt } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Routes, Route } from '@kbn/shared-ux-router';

import {
  COLLECTION_EXPLORER_PATH,
  COLLECTION_INTEGRATE_PATH,
  COLLECTION_OVERVIEW_PATH,
} from '../../routes';
import { AddAnalyticsCollection } from '../add_analytics_collections/add_analytics_collection';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionDataViewLogic } from './analytics_collection_data_view_logic';

import { AnalyticsCollectionExplorer } from './analytics_collection_explorer/analytics_collection_explorer';

import { AnalyticsCollectionIntegrateView } from './analytics_collection_integrate/analytics_collection_integrate_view';
import { AnalyticsCollectionOverview } from './analytics_collection_overview/analytics_collection_overview';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';

import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

export const AnalyticsCollectionView: React.FC = () => {
  useMountedLogic(AnalyticsCollectionToolbarLogic);
  useMountedLogic(AnalyticsCollectionDataViewLogic);
  const { fetchAnalyticsCollection } = useActions(FetchAnalyticsCollectionLogic);
  const { analyticsCollection, isLoading } = useValues(FetchAnalyticsCollectionLogic);
  const { name } = useParams<{ name: string }>();

  useEffect(() => {
    fetchAnalyticsCollection(name);
  }, []);

  if (analyticsCollection) {
    return (
      <Routes>
        <Route exact path={COLLECTION_OVERVIEW_PATH}>
          <AnalyticsCollectionOverview analyticsCollection={analyticsCollection} />
        </Route>

        <Route exact path={COLLECTION_INTEGRATE_PATH}>
          <AnalyticsCollectionIntegrateView analyticsCollection={analyticsCollection} />
        </Route>

        <Route exact path={COLLECTION_EXPLORER_PATH}>
          <AnalyticsCollectionExplorer />
        </Route>
      </Routes>
    );
  }

  return (
    <EnterpriseSearchAnalyticsPageTemplate pageChrome={[]} restrictWidth isLoading={isLoading}>
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
        actions={[<AddAnalyticsCollection />]}
      />
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
