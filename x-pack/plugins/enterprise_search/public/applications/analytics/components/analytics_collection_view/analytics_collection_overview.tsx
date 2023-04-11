/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { COLLECTION_INTEGRATE_PATH } from '../../routes';
import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';
import { AnalyticsCollectionToolbar } from './analytics_collection_toolbar/analytics_collection_toolbar';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';
import { AnalyticsEventsExistLogic } from './analytics_events_exist_logic';

interface AnalyticsCollectionOverviewProps {
  analyticsCollection: AnalyticsCollection;
}

export const AnalyticsCollectionOverview: React.FC<AnalyticsCollectionOverviewProps> = ({
  analyticsCollection,
}) => {
  const { setTimeRange } = useActions(AnalyticsCollectionToolbarLogic);
  const { timeRange, searchSessionId } = useValues(AnalyticsCollectionToolbarLogic);

  const { navigateToUrl } = useValues(KibanaLogic);
  const { analyticsEventsExist } = useActions(AnalyticsEventsExistLogic);
  const { hasEvents } = useValues(AnalyticsEventsExistLogic);

  useEffect(() => {
    analyticsEventsExist(analyticsCollection.name);
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      pageChrome={[analyticsCollection?.name]}
      analyticsName={analyticsCollection?.name}
      pageViewTelemetry={`View Analytics Collection - Overview`}
      pageHeader={{
        bottomBorder: false,
        pageTitle: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.title', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [<AnalyticsCollectionToolbar />],
      }}
    >
      {!hasEvents && (
        <>
          <EuiCallOut
            color="primary"
            iconType="download"
            title={i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.title',
              {
                defaultMessage: 'Install our tracker',
              }
            )}
          >
            <EuiText>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.description',
                {
                  defaultMessage:
                    'Start receiving metric data in this Collection by installing our tracker in your search application.',
                }
              )}
            </EuiText>
            <EuiSpacer />
            <EuiButton
              fill
              type="submit"
              onClick={() =>
                navigateToUrl(
                  generateEncodedPath(COLLECTION_INTEGRATE_PATH, {
                    name: analyticsCollection.name,
                  })
                )
              }
            >
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.button',
                {
                  defaultMessage: 'Learn how',
                }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <AnalyticsCollectionChartWithLens
        id={'analytics-collection-chart-' + analyticsCollection.name}
        dataViewQuery={analyticsCollection.events_datastream}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        searchSessionId={searchSessionId}
      />
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
