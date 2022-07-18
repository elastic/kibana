/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';

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

export const RelatedAlertsByProcessAncestry = React.memo<Props>(({ data, eventId, timelineId }) => {
  const { loading, error, count, alertIds } = useAlertPrevalenceFromProcessTree({
    parentEntityId: data.values,
    timelineId: timelineId ?? '',
    signalIndexName: null,
  });

  const dataProviders = useMemo(() => {
    if (alertIds && alertIds.length) {
      return alertIds.reduce<DataProvider[]>((result, alertId, index) => {
        const id = `${timelineId}-${eventId}-event.id-${index}-${alertId}`;
        result.push(getDataProvider('event.id', id, alertId));
        return result;
      }, []);
    }
    return null;
  }, [alertIds, eventId, timelineId]);

  const renderContent = useCallback(() => {
    if (!alertIds || !dataProviders) {
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
  }, [alertIds, dataProviders]);

  return (
    <InsightAccordion
      prefix="RelatedAlertsByProcessAncestry"
      loading={loading}
      loadingText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_loading',
        { defaultMessage: 'Loading related alerts by ancestry' }
      )}
      error={error}
      errorText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_error',
        {
          defaultMessage: 'Failed to load related alerts by ancestry',
        }
      )}
      text={
        alertIds
          ? i18n.translate(
              'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_process_ancestry_found',
              {
                defaultMessage:
                  '{count} {count, plural, =1 {alert} other {alerts}} related by ancestry',
                values: { count },
              }
            )
          : ''
      }
      renderContent={renderContent}
    />
  );
});

RelatedAlertsByProcessAncestry.displayName = 'RelatedAlertsByProcessAncestry';
