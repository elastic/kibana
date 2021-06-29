/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { TimelineEventsDetailsItem } from '../../../common/search_strategy';

export const endpointAlertCheck = ({ data }: { data: TimelineEventsDetailsItem[] | null }) => {
  const findEndpointAlert = find({ field: 'agent.type' }, data)?.values;
  return findEndpointAlert ? findEndpointAlert[0] === 'endpoint' : false;
};
