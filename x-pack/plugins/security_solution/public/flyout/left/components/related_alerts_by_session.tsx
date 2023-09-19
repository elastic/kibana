/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID } from './test_ids';

export interface RelatedAlertsBySessionProps {
  /**
   * Value of the process.entry_leader.entity_id field
   */
  entityId: string;
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
 * Show related alerts by session in an expandable panel with a table
 */
export const RelatedAlertsBySession: React.VFC<RelatedAlertsBySessionProps> = ({
  entityId,
  scopeId,
  eventId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsBySession({
    entityId,
    scopeId,
  });

  if (error) {
    return null;
  }

  return (
    <CorrelationsDetailsAlertsTable
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.sessionAlertsTitle"
          defaultMessage="{count} {count, plural, one {alert} other {alerts}} related by session"
          values={{ count: dataCount }}
        />
      }
      loading={loading}
      alertIds={data}
      scopeId={scopeId}
      eventId={eventId}
      noItemsMessage={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.sessionAlertsNoDataDescription"
          defaultMessage="No alerts related by session."
        />
      }
      data-test-subj={CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}
    />
  );
};

RelatedAlertsBySession.displayName = 'RelatedAlertsBySession';
