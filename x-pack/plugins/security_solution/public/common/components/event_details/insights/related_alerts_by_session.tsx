/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { isActiveTimeline } from '../../../../helpers';
import type { BrowserFields } from '../../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useActionCellDataProvider } from '../table/use_action_cell_data_provider';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import type { InsightAccordionState } from './insight_accordion';
import { InsightAccordion } from './insight_accordion';
import { InvestigateInTimelineButton } from '../table/investigate_in_timeline_button';
import { SimpleAlertTable } from './simple_alert_table';
import { getEnrichedFieldInfo } from '../helpers';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';
import { SESSION_LOADING, SESSION_EMPTY, SESSION_ERROR, SESSION_COUNT } from './translations';

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem;
  eventId: string;
  scopeId: string;
}

/**
 * Fetches the count of alerts that were generated in the same session
 * and displays an accordion with a mini table representation of the
 * related cases.
 * Offers the ability to dive deeper into the investigation by opening
 * the related alerts in a timeline investigation.
 */
export const RelatedAlertsBySession = React.memo<Props>(
  ({ browserFields, data, eventId, scopeId }) => {
    const { field, values } = data;
    const { error, count, alertIds } = useAlertPrevalence({
      field,
      value: values,
      isActiveTimelines: isActiveTimeline(scopeId),
      signalIndexName: null,
      includeAlertIds: true,
      ignoreTimerange: true,
    });

    const { fieldFromBrowserField } = getEnrichedFieldInfo({
      browserFields,
      contextId: scopeId,
      eventId,
      field: { id: data.field },
      scopeId,
      item: data,
    });

    const cellData = useActionCellDataProvider({
      field,
      values,
      contextId: scopeId,
      eventId,
      fieldFromBrowserField,
      fieldFormat: fieldFromBrowserField?.format,
      fieldType: fieldFromBrowserField?.type,
    });

    const isEmpty = count === 0;

    let state: InsightAccordionState = 'loading';
    if (error) {
      state = 'error';
    } else if (alertIds || isEmpty) {
      state = 'success';
    }

    const renderContent = useCallback(() => {
      if (!alertIds || !cellData?.dataProviders) {
        return null;
      } else if (isEmpty && state !== 'loading') {
        return SESSION_EMPTY;
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
    }, [alertIds, cellData?.dataProviders, isEmpty, state]);

    return (
      <InsightAccordion
        prefix="RelatedAlertsBySession"
        state={state}
        text={getTextFromState(state, count)}
        renderContent={renderContent}
      />
    );
  }
);

RelatedAlertsBySession.displayName = 'RelatedAlertsBySession';

function getTextFromState(state: InsightAccordionState, count: number | undefined) {
  switch (state) {
    case 'loading':
      return SESSION_LOADING;
    case 'error':
      return SESSION_ERROR;
    case 'success':
      return SESSION_COUNT(count);
    default:
      return '';
  }
}
