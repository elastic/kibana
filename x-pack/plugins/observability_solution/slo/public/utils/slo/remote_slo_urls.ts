/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import path from 'path';
import { paths } from '../../../common/locators/paths';

// TODO Kevin: Add spaceId in remote schema?
export function createRemoteSloDetailsUrl(
  slo: SLOWithSummaryResponse,
  spaceId: string = 'default'
) {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const detailsPath = paths.sloDetails(
    slo.id,
    ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
  );

  const remoteUrl = new URL(path.join(spacePath, detailsPath), slo.remote.kibanaUrl);
  return remoteUrl.toString();
}
