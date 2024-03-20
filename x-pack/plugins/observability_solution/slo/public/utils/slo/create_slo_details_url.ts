/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../common/locators/paths';

export function createSloDetailsUrl(slo: SLOWithSummaryResponse) {
  return slo.kibanaUrl
    ? (
        slo.kibanaUrl +
        paths.sloDetails(
          slo.id,
          ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined,
          slo.remoteName
        )
      ).replace(/\/\//g, '/')
    : undefined;
}
