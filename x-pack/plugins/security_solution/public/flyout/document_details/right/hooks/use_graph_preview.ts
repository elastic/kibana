/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { get } from 'lodash/fp';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { getFieldArray } from '../../shared/utils';

export interface UseGraphPreviewParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;

  /**
   * An object with top level fields from the ECS object
   */
  ecsData: Ecs;
}

/**
 * Hook that returns the graph view configuration if the graph view is available for the alert
 */
export const useGraphPreview = ({ getFieldsData, ecsData }: UseGraphPreviewParams) => {
  const eventIds = getFieldArray(getFieldsData('kibana.alert.original_event.id'));
  const actorsIds = getFieldArray(getFieldsData('actor.entity.id'));
  const action = get(['event', 'action'], ecsData);
  const isAuditLog = (actorsIds?.length ?? 0) > 0 && action?.length > 0 && eventIds?.length > 0;

  return isAuditLog;
};
