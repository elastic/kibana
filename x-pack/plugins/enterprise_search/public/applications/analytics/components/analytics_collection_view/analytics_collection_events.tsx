/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID } from '../../../../../common/constants';
import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { EntSearchLogStream } from '../../../shared/log_stream';

interface AnalyticsCollectionEventsProps {
  collection: AnalyticsCollection;
}

const EVENTS_POLLING_INTERVAL = 30 * 1000;

export const AnalyticsCollectionEvents: React.FC<AnalyticsCollectionEventsProps> = ({
  collection,
}) => {
  // Since EntSearchLogStream component doesn't have a poll interval property
  // but gets reloaded on every filter or query change, it was decided to introduce
  // a mutable filters state and reset it every 30 seconds to trigger polling

  const [filters, setFilters] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFilters([]);
    }, EVENTS_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
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
      filters={filters}
    />
  );
};
