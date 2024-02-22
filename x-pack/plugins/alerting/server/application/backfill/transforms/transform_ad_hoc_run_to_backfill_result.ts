/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { AdHocRunSO } from '../../../data/ad_hoc_run/types';
import { createBackfillError } from '../../../backfill_client/lib';
import { ScheduleBackfillResult } from '../methods/schedule/types';

export const transformAdHocRunToBackfillResult = ({
  id,
  attributes,
  references,
  error,
}: SavedObject<AdHocRunSO>): ScheduleBackfillResult => {
  if (error) {
    return createBackfillError(error.error, error.message);
  }

  if (!id) {
    return createBackfillError(
      'Internal Server Error',
      'Malformed saved object in bulkCreate response - Missing "id".'
    );
  }

  if (!attributes) {
    return createBackfillError(
      'Internal Server Error',
      'Malformed saved object in bulkCreate response - Missing "attributes".'
    );
  }

  if (!references || !references.length) {
    return createBackfillError(
      'Internal Server Error',
      'Malformed saved object in bulkCreate response - Missing "references".'
    );
  }

  return {
    id,
    // exclude API key information
    createdAt: attributes.createdAt,
    duration: attributes.duration,
    enabled: attributes.enabled,
    ...(attributes.end ? { end: attributes.end } : {}),
    rule: {
      ...attributes.rule,
      id: references[0].id,
    },
    spaceId: attributes.spaceId,
    start: attributes.start,
    status: attributes.status,
    schedule: attributes.schedule,
  };
};
