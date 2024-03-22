/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, getOr, some } from 'lodash/fp';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getFieldValue } from '../../detections/components/host_isolation/helpers';

/**
 * Check to see if a timeline event item is an Alert (vs an event)
 * @param timelineEventItem
 */
export const isTimelineEventItemAnAlert = (
  timelineEventItem: TimelineEventsDetailsItem[]
): boolean => {
  return some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, timelineEventItem);
};

export const CROWDSTRIKE_AGENT_ID_FIELD = 'crowdstrike.event.DeviceId';

export const getCrowdstrikeAgentId = (data: TimelineEventsDetailsItem[] | null) => {
  return (
    getFieldValue({ category: 'crowdstrike', field: CROWDSTRIKE_AGENT_ID_FIELD }, data) || undefined
  );
};

/**
 * Checks to see if the given set of Timeline event detail items includes data that indicates its
 * an endpoint Alert. Note that it will NOT match on Events - only alerts
 * @param data
 */
export const isAlertFromCrowdstrikeEvent = ({
  data,
}: {
  data: TimelineEventsDetailsItem[];
}): boolean => {
  if (!isTimelineEventItemAnAlert(data)) {
    return false;
  }

  const findEndpointAlert = find({ field: 'event.module' }, data)?.values;
  return findEndpointAlert ? findEndpointAlert[0] === 'crowdstrike' : false;
};

/**
 * Checks to see if the given alert was generated out of the Crowdstrike Alerts dataset, coming from
 * sentinel_one Fleet integration
 * @param ecsData
 */
export const isAlertFromCrowdstrikeAlert = ({
  ecsData,
}: {
  ecsData: Ecs | null | undefined;
}): boolean => {
  if (ecsData == null) {
    return false;
  }

  const eventModules = getOr([], 'kibana.alert.original_event.module', ecsData);
  const kinds = getOr([], 'kibana.alert.original_event.dataset', ecsData);

  return eventModules.includes('crowdstrike') && kinds.includes('alert');
};
