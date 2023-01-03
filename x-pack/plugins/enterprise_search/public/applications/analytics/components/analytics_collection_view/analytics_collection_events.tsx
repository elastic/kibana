/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiEmptyPrompt, EuiButton, EuiLink, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID } from '../../../../../common/constants';
import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';

import { EntSearchLogStream } from '../../../shared/log_stream';
import { COLLECTION_VIEW_PATH } from '../../routes';

import { AnalyticsEventsIndexExistsLogic } from './analytics_events_index_exists_logic';

interface AnalyticsCollectionEventsProps {
  collection: AnalyticsCollection;
}

const EVENTS_POLLING_INTERVAL = 30 * 1000;

export const AnalyticsCollectionEvents: React.FC<AnalyticsCollectionEventsProps> = ({
  collection,
}) => {
  const { analyticsEventsIndexExists } = useActions(AnalyticsEventsIndexExistsLogic);
  const { isLoading, isPresent } = useValues(AnalyticsEventsIndexExistsLogic);
  const { navigateToUrl } = useValues(KibanaLogic);

  useEffect(() => {
    analyticsEventsIndexExists(collection.id);

    const interval = setInterval(() => {
      analyticsEventsIndexExists(collection.id);
    }, EVENTS_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {(isLoading || !isPresent) && (
        <EuiEmptyPrompt
          iconType="visLine"
          title={
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.emptyState.title"
                  defaultMessage="{title}"
                  values={{
                    title: (
                      <>
                        There are no analytics events for <strong>{collection.name}</strong> yet
                      </>
                    ),
                  }}
                />
              </h2>
            </EuiTitle>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.emptyState.body',
            {
              defaultMessage:
                "Start tracking events by adding the behavioral analytics client to every page of your website or application that you'd like to track",
            }
          )}
          actions={
            <EuiButton
              color="primary"
              fill
              onClick={() =>
                navigateToUrl(
                  generateEncodedPath(COLLECTION_VIEW_PATH, {
                    id: collection.id,
                    section: 'integrate',
                  })
                )
              }
            >
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.emptyState.actions',
                {
                  defaultMessage: 'View integration instructions',
                }
              )}
            </EuiButton>
          }
          footer={
            <EuiLink href="#" target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.emptyState.footer',
                {
                  defaultMessage: 'Visit the behavioral analytics documentation',
                }
              )}
            </EuiLink>
          }
        />
      )}
      {!isLoading && isPresent && (
        <EntSearchLogStream
          logView={{
            type: 'log-view-reference',
            logViewId: ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID,
          }}
          columns={[
            {
              type: 'timestamp',
            },
            {
              type: 'field',
              header: i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.columns.eventName',
                {
                  defaultMessage: 'Event name',
                }
              ),
              field: 'event.action',
            },
            {
              type: 'field',
              header: i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.eventsTab.columns.userUuid',
                {
                  defaultMessage: 'User UUID',
                }
              ),
              field: 'labels.user_uuid',
            },
          ]}
          query={`_index: ${collection.events_datastream}`}
        />
      )}
    </>
  );
};
