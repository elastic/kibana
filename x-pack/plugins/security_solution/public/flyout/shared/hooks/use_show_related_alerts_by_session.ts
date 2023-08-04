/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { hasData } from '../../../common/components/event_details/insights/helpers';

export interface UseShowRelatedAlertsBySessionParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
}

/**
 * Returns true if document has process.entry_leader.entity_id field with values
 */
export const useShowRelatedAlertsBySession = ({
  dataFormattedForFieldBrowser,
}: UseShowRelatedAlertsBySessionParams): boolean => {
  const processSessionField = find(
    { category: 'process', field: 'process.entry_leader.entity_id' },
    dataFormattedForFieldBrowser
  );

  return hasData(processSessionField);
};
