/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, getOr, some } from 'lodash/fp';
import { TimelineEventsDetailsItem } from '../../../../timelines/common';
import { Ecs } from '../../../common/ecs';

/**
 * Checks to see if the given set of Timeline event detail items includes data that indicates its
 * an endpoint Alert. Note that it will NOT match on Events - only alerts
 * @param data
 */
export const isAlertFromEndpointEvent = ({
  data,
}: {
  data: TimelineEventsDetailsItem[];
}): boolean => {
  const isAlert = some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data);

  if (!isAlert) {
    return false;
  }

  const findEndpointAlert = find({ field: 'agent.type' }, data)?.values;
  return findEndpointAlert ? findEndpointAlert[0] === 'endpoint' : false;
};

export const isAlertFromEndpointAlert = ({
  ecsData,
}: {
  ecsData: Ecs | null | undefined;
}): boolean => {
  if (ecsData == null) {
    return false;
  }

  const eventModules = getOr([], 'kibana.alert.original_event.module', ecsData);
  const kinds = getOr([], 'kibana.alert.original_event.kind', ecsData);

  return eventModules.includes('endpoint') && kinds.includes('alert');
};
