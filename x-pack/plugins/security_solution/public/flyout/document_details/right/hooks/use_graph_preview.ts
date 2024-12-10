/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { get } from 'lodash/fp';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { getField, getFieldArray } from '../../shared/utils';

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
 * Interface for the result of the useGraphPreview hook
 */
export interface UseGraphPreviewResult {
  /**
   * The timestamp of the event
   */
  timestamp: string | null;

  /**
   * Array of event IDs associated with the alert
   */
  eventIds: string[];

  /**
   * Array of actor entity IDs associated with the alert
   */
  actorIds: string[];

  /**
   * Action associated with the event
   */
  action?: string[];

  /**
   * Boolean indicating if the event is an audit log (contains event ids, actor ids and action)
   */
  isAuditLog: boolean;
}

/**
 * Hook that returns the graph view configuration if the graph view is available for the alert
 */
export const useGraphPreview = ({
  getFieldsData,
  ecsData,
}: UseGraphPreviewParams): UseGraphPreviewResult => {
  const timestamp = getField(getFieldsData('@timestamp'));
  const originalEventId = getFieldsData('kibana.alert.original_event.id');
  const eventId = getFieldsData('event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  const actorIds = getFieldArray(getFieldsData('actor.entity.id'));
  const action: string[] | undefined = get(['event', 'action'], ecsData);
  const isAuditLog =
    Boolean(timestamp) && actorIds.length > 0 && Boolean(action?.length) && eventIds.length > 0;

  return { timestamp, eventIds, actorIds, action, isAuditLog };
};
