/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { getSummaryRows } from '../../../common/components/event_details/get_alert_summary_rows';

export interface UsePrevalenceHighlightedFieldsParams {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
}

/**
 * Hook to retrieve the highlighted fields, then prepare the data to be used in the query
 */
export const usePrevalenceHighlightedFields = ({
  eventId,
  scopeId,
  browserFields,
  dataFormattedForFieldBrowser,
  investigationFields,
}: UsePrevalenceHighlightedFieldsParams): {
  [key: string]: { match: { [key: string]: string } };
} => {
  const summaryRows = getSummaryRows({
    browserFields: browserFields || {},
    data: dataFormattedForFieldBrowser || [],
    eventId,
    scopeId,
    investigationFields,
    isReadOnly: false,
  });

  return summaryRows.reduce((acc, row) => {
    const {
      description: {
        data: { field },
        values,
      },
    } = row;
    return {
      ...acc,
      [field]: { match: { [field]: (values || [])[0] } },
    };
  }, []) as unknown as { [key: string]: { match: { [key: string]: string } } };
};
