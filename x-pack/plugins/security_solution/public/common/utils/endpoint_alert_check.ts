/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, some } from 'lodash/fp';
import { TimelineEventsDetailsItem } from '../../../../timelines/common';

/**
 * Checks to see if the given set of Timeline event detail items includes data that indicates its
 * an endpoint Alert. Note that it will NOT match on Events - only alerts
 * @param data
 */
export const endpointAlertCheck = ({ data }: { data: TimelineEventsDetailsItem[] }): boolean => {
  const isAlert = some({ category: 'signal', field: 'signal.rule.id' }, data);

  if (!isAlert) {
    return false;
  }

  const findEndpointAlert = find({ field: 'agent.type' }, data)?.values;
  return findEndpointAlert ? findEndpointAlert[0] === 'endpoint' : false;
};
