/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../common/locators/paths';

// TODO Kevin: we should use a similar function for remote delete URls and co.
export function createRemoteSloDetailsUrl(slo: SLOWithSummaryResponse, spaceId?: string) {
  if (!slo.remote) {
    return undefined;
  }

  return (
    slo.remote.kibanaUrl +
    (spaceId ? `/s/${spaceId}` : '') +
    paths.sloDetails(
      slo.id,
      ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
    )
  ).replace(/\/\//g, '/');
}
