/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';
import { getSummaryRows } from '../../../common/components/event_details/get_alert_summary_rows';
import { PrevalenceOverviewRow } from '../components/prevalence_overview_row';
import { INSIGHTS_PREVALENCE_ROW_TEST_ID } from '../components/test_ids';

export interface UsePrevalenceParams {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * User defined fields to highlight (defined on rule)
   */
  investigationFields?: string[];
}

/**
 * This hook retrieves the highlighted fields from the {@link getSummaryRows} method, then iterates through them
 * and generate a {@link PrevalenceOverviewRow} for each.
 * We use a callback method passed down to the {@link PrevalenceOverviewRow} component to know when it's rendered as null.
 * We need to let the parent know when all the {@link PrevalenceOverviewRow} are null, so it can hide then entire section.
 */
export const usePrevalence = ({
  eventId,
  browserFields,
  dataFormattedForFieldBrowser,
  investigationFields,
  scopeId,
}: UsePrevalenceParams): ReactElement[] => {
  // retrieves the highlighted fields
  const summaryRows = useMemo(
    () =>
      getSummaryRows({
        browserFields: browserFields || {},
        data: dataFormattedForFieldBrowser || [],
        investigationFields: investigationFields || [],
        eventId,
        scopeId,
        isReadOnly: false,
      }),
    [browserFields, investigationFields, dataFormattedForFieldBrowser, eventId, scopeId]
  );

  return useMemo(
    () =>
      summaryRows.map((row) => {
        const highlightedField = {
          name: row.description.data.field,
          values: row.description.values || [],
        };

        return (
          <PrevalenceOverviewRow
            highlightedField={highlightedField}
            data-test-subj={INSIGHTS_PREVALENCE_ROW_TEST_ID}
            key={row.description.data.field}
          />
        );
      }),
    [summaryRows]
  );
};
