/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTRY_LEADER_ENTITY_ID } from '../constants/field_names';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { getField } from '../utils';

export interface UseShowRelatedAlertsBySessionParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

export interface UseShowRelatedAlertsBySessionResult {
  /**
   * Returns true if the document has process.entry_leader.entity_id field with values
   */
  show: boolean;
  /**
   * Value of the process.entry_leader.entity_id field
   */
  entityId?: string;
}

/**
 * Returns true if document has process.entry_leader.entity_id field with values
 */
export const useShowRelatedAlertsBySession = ({
  getFieldsData,
}: UseShowRelatedAlertsBySessionParams): UseShowRelatedAlertsBySessionResult => {
  const entityId = getField(getFieldsData(ENTRY_LEADER_ENTITY_ID));
  return {
    show: entityId != null,
    ...(entityId && { entityId }),
  };
};
