/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';

import type { BrowserFields } from '../../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useActionCellDataProvider } from '../table/use_action_cell_data_provider';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { InsightAccordion } from './insight_accordion';
import { InvestigateInTimelineButton } from '../table/investigate_in_timeline_button';
import { SimpleAlertTable } from './simple_alert_table';
import { getEnrichedFieldInfo } from '../helpers';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem;
  eventId: string;
  timelineId: string;
}

export const RelatedAlertsBySourceEvent = React.memo<Props>(
  ({ browserFields, data, eventId, timelineId }) => {
    const { field, values } = data;
    const { loading, error, count, alertIds } = useAlertPrevalence({
      field,
      value: values,
      timelineId: timelineId ?? '',
      signalIndexName: null,
      includeAlertIds: true,
    });

    const { fieldFromBrowserField } = getEnrichedFieldInfo({
      browserFields,
      contextId: timelineId,
      eventId,
      field: { id: data.field },
      timelineId,
      item: data,
    });

    const cellData = useActionCellDataProvider({
      field,
      values,
      contextId: timelineId,
      eventId,
      fieldFromBrowserField,
      fieldFormat: fieldFromBrowserField?.format,
      fieldType: fieldFromBrowserField?.type,
    });

    const renderContent = useCallback(() => {
      if (!alertIds || !cellData?.dataProviders) {
        return null;
      }
      return (
        <>
          <SimpleAlertTable alertIds={alertIds} />
          <EuiSpacer />
          <InvestigateInTimelineButton
            asEmptyButton={false}
            dataProviders={cellData?.dataProviders}
          >
            {ACTION_INVESTIGATE_IN_TIMELINE}
          </InvestigateInTimelineButton>
        </>
      );
    }, [alertIds, cellData?.dataProviders]);

    const isEmpty = count === 0;

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
        empty={isEmpty}
        renderContent={renderContent}
      />
    );
  }
);

RelatedAlertsBySourceEvent.displayName = 'RelatedAlertsBySourceEvent';
