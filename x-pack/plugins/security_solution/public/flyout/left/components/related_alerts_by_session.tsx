/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { CORRELATIONS_SESSION_ALERTS } from '../../shared/translations';
import { AlertsTable } from './correlations_details_alerts_table';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import {
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID,
} from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsBySessionProps {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 *
 */
export const RelatedAlertsBySession: React.VFC<RelatedAlertsBySessionProps> = ({
  dataFormattedForFieldBrowser,
  scopeId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsBySession({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  const title = `${dataCount} ${CORRELATIONS_SESSION_ALERTS(dataCount)}`;

  if (error) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: ICON,
      }}
      content={{ error }}
      expand={{
        expandable: true,
        expandedOnFirstRender: true,
      }}
      data-test-subj={CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}
    >
      <AlertsTable
        loading={loading}
        alertIds={data}
        data-test-subj={CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID}
      />
    </ExpandablePanel>
  );
};

RelatedAlertsBySession.displayName = 'RelatedAlertsBySession';
