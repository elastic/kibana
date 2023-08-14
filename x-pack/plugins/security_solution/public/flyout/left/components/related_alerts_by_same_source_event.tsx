/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { CORRELATIONS_SAME_SOURCE_ALERTS } from '../../shared/translations';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import {
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID,
} from './test_ids';
import { AlertsTable } from './correlations_details_alerts_table';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

const ICON = 'warning';

export interface RelatedAlertsBySameSourceEventProps {
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
export const RelatedAlertsBySameSourceEvent: React.VFC<RelatedAlertsBySameSourceEventProps> = ({
  dataFormattedForFieldBrowser,
  scopeId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  const title = `${dataCount} ${CORRELATIONS_SAME_SOURCE_ALERTS(dataCount)}`;

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
      data-test-subj={CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID}
    >
      <AlertsTable
        loading={loading}
        alertIds={data}
        data-test-subj={CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID}
      />
    </ExpandablePanel>
  );
};

RelatedAlertsBySameSourceEvent.displayName = 'RelatedAlertsBySameSourceEvent';
