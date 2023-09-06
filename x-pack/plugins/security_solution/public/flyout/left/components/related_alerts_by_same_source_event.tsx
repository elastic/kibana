/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RELATED_ALERTS_BY_SOURCE_EVENT_NO_DATA } from './translations';
import { CORRELATIONS_SAME_SOURCE_ALERTS } from '../../shared/translations';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID } from './test_ids';
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';

export interface RelatedAlertsBySameSourceEventProps {
  /**
   * Value of the kibana.alert.original_event.id field
   */
  originalEventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Show related alerts by same source event in an expandable panel with a table
 */
export const RelatedAlertsBySameSourceEvent: React.VFC<RelatedAlertsBySameSourceEventProps> = ({
  originalEventId,
  scopeId,
  eventId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsBySameSourceEvent({
    originalEventId,
    scopeId,
  });
  const title = `${dataCount} ${CORRELATIONS_SAME_SOURCE_ALERTS(dataCount)}`;

  if (error) {
    return null;
  }

  return (
    <CorrelationsDetailsAlertsTable
      title={title}
      loading={loading}
      alertIds={data}
      scopeId={scopeId}
      eventId={eventId}
      noItemsMessage={RELATED_ALERTS_BY_SOURCE_EVENT_NO_DATA}
      data-test-subj={CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID}
    />
  );
};

RelatedAlertsBySameSourceEvent.displayName = 'RelatedAlertsBySameSourceEvent';
