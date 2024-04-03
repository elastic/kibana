/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { ANCESTOR_ID } from '../constants/field_names';
import { getField } from '../utils';

export interface ShowRelatedAlertsBySameSourceEventParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

export interface ShowRelatedAlertsBySameSourceEventResult {
  /**
   * Returns true if the document has kibana.alert.original_event.id field with values
   */
  show: boolean;
  /**
   * Value of the kibana.alert.original_event.id field
   */
  originalEventId?: string;
}

/**
 * Returns true if document has kibana.alert.original.event.id field with values
 */
export const useShowRelatedAlertsBySameSourceEvent = ({
  getFieldsData,
}: ShowRelatedAlertsBySameSourceEventParams): ShowRelatedAlertsBySameSourceEventResult => {
  const originalEventId = getField(getFieldsData(ANCESTOR_ID));
  return {
    show: originalEventId != null,
    ...(originalEventId && { originalEventId }),
  };
};
