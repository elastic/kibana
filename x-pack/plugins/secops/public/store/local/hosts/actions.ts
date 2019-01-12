/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/secops/local/hosts');

export const updateAuthorizationsLimit = actionCreator<{ limit: number }>(
  'UPDATE_AUTHORIZATIONS_LIMIT'
);

export const updateHostsLimit = actionCreator<{ limit: number }>('UPDATE_HOSTS_LIMIT');

export const updateEventsLimit = actionCreator<{ limit: number }>('UPDATE_EVENTS_LIMIT');

export const updateUncommonProcessesLimit = actionCreator<{ limit: number }>(
  'UPDATE_UNCOMMONPROCESSES_LIMIT'
);

export const updateUncommonProcessesUpperLimit = actionCreator<{ upperLimit: number }>(
  'UPDATE_UNCOMMONPROCESSES_UPPER_LIMIT'
);
