/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pick from 'lodash/pick';
import partition from 'lodash/partition';

import type { SignalSourceHit } from '../types';

/**
 * TODO: add description
 * @param events
 * @param suppressedBy
 * @returns
 */
export const partitionMissingFieldsEvents = (
  events: SignalSourceHit[],
  suppressedBy: string[] = []
): SignalSourceHit[][] => {
  return partition(events, (event) => {
    if (suppressedBy.length === 0) {
      return true;
    }
    const hasMissingFields =
      Object.keys(pick(event.fields, suppressedBy)).length < suppressedBy.length;

    return !hasMissingFields;
  });
};
