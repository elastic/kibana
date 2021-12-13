/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEvent } from '../../../../event_log/server';

export function logCreatorFactory(base: IEvent) {
  return (mergeIn: IEvent) => ({
    ...base,
    kibana: {
      reporting: {
        ...base?.kibana?.reporting,
        ...mergeIn?.kibana?.reporting,
        csv: {
          ...base?.kibana?.reporting?.csv,
          ...mergeIn?.kibana?.reporting?.csv,
        },
      },
    },
    log: {
      ...base?.log,
      ...mergeIn?.log,
    },
    event: {
      ...base?.event,
      ...mergeIn?.event,
    },
    error: {
      ...base?.error,
      ...mergeIn?.error,
    },
    message: mergeIn?.message,
  });
}

export function registerEventLogProviderActions() {}
