/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { InsightAccordion } from './insight_accordion';
import { SimpleAlertTable } from './simple_alert_table';

interface Props {
  data: TimelineEventsDetailsItem;
  timelineId?: string;
}

export const RelatedAlertsBySourceEvent = React.memo<Props>(({ data, timelineId }) => {
  const { field, values } = data;
  const { loading, error, count, alertIds } = useAlertPrevalence({
    field,
    value: values,
    timelineId: timelineId ?? '',
    signalIndexName: null,
    includeAlertIds: true,
  });

  const renderContent = useCallback(() => {
    if (!alertIds) {
      return null;
    }
    return <SimpleAlertTable alertIds={alertIds} />;
  }, [alertIds]);

  return (
    <InsightAccordion
      prefix="RelatedAlertsBySourceEvent"
      loading={loading}
      loadingText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_source_event_loading',
        { defaultMessage: 'Loading related alerts by source event' }
      )}
      error={error}
      errorText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_source_event_error',
        {
          defaultMessage: 'Failed to load related alerts by source event',
        }
      )}
      text={
        alertIds
          ? i18n.translate(
              'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_source_event__found',
              {
                defaultMessage:
                  '{count} {count, plural, =1 {alert} other {alerts}} related by source event',
                values: { count },
              }
            )
          : ''
      }
      renderContent={renderContent}
    />
  );
});

RelatedAlertsBySourceEvent.displayName = 'RelatedAlertsBySourceEvent';
