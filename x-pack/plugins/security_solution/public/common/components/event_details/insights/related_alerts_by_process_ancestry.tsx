/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import type { DataProvider } from '../../../../../common/types';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { getDataProvider } from '../table/use_action_cell_data_provider';
import { useAlertPrevalenceFromProcessTree } from '../../../containers/alerts/use_alert_prevalence_from_process_tree';
import { InsightAccordion } from './insight_accordion';
import { SimpleAlertTable } from './simple_alert_table';
import { InvestigateInTimelineButton } from '../table/investigate_in_timeline_button';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

interface Props {
  data: TimelineEventsDetailsItem;
  eventId: string;
  timelineId?: string;
}

interface Cache {
  alertIds: string[];
}

export const RelatedAlertsByProcessAncestry = React.memo<Props>(({ data, eventId, timelineId }) => {
  const [showContent, setShowContent] = useState(false);
  const [cache, setCache] = useState<Partial<Cache>>({});

  const onToggle = useCallback((isOpen: boolean) => setShowContent(isOpen), []);

  const renderContent = useCallback(() => {
    if (!showContent) {
      return null;
    } else if (cache.alertIds) {
      <ActualRelatedAlertsByProcessAncestry
        data={data}
        eventId={eventId}
        timelineId={timelineId}
        alertIds={cache.alertIds}
      />;
    }
    return (
      <FetchAndShowRelatedAlertsByProcessAncestry
        data={data}
        eventId={eventId}
        timelineId={timelineId}
        onCacheLoad={setCache}
      />
    );
  }, [showContent, cache, data, eventId, timelineId]);

  const isEmpty = !!cache.alertIds && cache.alertIds.length == 0;

  return (
    <InsightAccordion
      prefix="RelatedAlertsByProcessAncestry"
      loading={false}
      loadingText=""
      error={false}
      errorText=""
      text={
        cache.alertIds
          ? i18n.translate(
              'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_with_count',
              {
                defaultMessage:
                  '{count} {count, plural, =1 {alert} other {alerts}} by process ancestry',
                values: { count: cache.alertIds.length },
              }
            )
          : i18n.translate(
              'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_found',
              {
                defaultMessage: 'Related alerts by process ancestry',
              }
            )
      }
      empty={isEmpty}
      renderContent={renderContent}
      onToggle={onToggle}
    />
  );
});

RelatedAlertsByProcessAncestry.displayName = 'RelatedAlertsByProcessAncestry';

const FetchAndShowRelatedAlertsByProcessAncestry = React.memo<
  Props & { onCacheLoad: (cache: Cache) => void }
>(({ data, eventId, timelineId, onCacheLoad }) => {
  const { loading, error, alertIds } = useAlertPrevalenceFromProcessTree({
    parentEntityId: data.values,
    timelineId: timelineId ?? '',
    signalIndexName: null,
  });

  useEffect(() => {
    if (alertIds) {
      onCacheLoad({ alertIds });
    }
  }, [alertIds, onCacheLoad]);

  if (loading) {
    return <EuiLoadingSpinner />;
  } else if (error) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_error"
        defaultMessage="Failed to fetch alerts."
      />
    );
  } else if (alertIds) {
    return (
      <ActualRelatedAlertsByProcessAncestry
        alertIds={alertIds}
        data={data}
        eventId={eventId}
        timelineId={timelineId}
      />
    );
  }

  return null;
});

FetchAndShowRelatedAlertsByProcessAncestry.displayName =
  'FetchAndShowRelatedAlertsByProcessAncestry';

const ActualRelatedAlertsByProcessAncestry = React.memo<Props & Cache>(
  ({ alertIds, eventId, timelineId }) => {
    const dataProviders = useMemo(() => {
      if (alertIds && alertIds.length) {
        return alertIds.reduce<DataProvider[]>((result, alertId, index) => {
          const id = `${timelineId}-${eventId}-event.id-${index}-${alertId}`;
          result.push(getDataProvider('_id', id, alertId));
          return result;
        }, []);
      }
      return null;
    }, [alertIds, eventId, timelineId]);

    if (!dataProviders) {
      return null;
    }

    return (
      <>
        <SimpleAlertTable alertIds={alertIds} />
        <EuiSpacer />
        <InvestigateInTimelineButton asEmptyButton={false} dataProviders={dataProviders}>
          {ACTION_INVESTIGATE_IN_TIMELINE}
        </InvestigateInTimelineButton>
      </>
    );
  }
);

ActualRelatedAlertsByProcessAncestry.displayName = 'ActualRelatedAlertsByProcessAncestry';
