/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import path from 'path';
import { paths } from '../../../common/locators/paths';

// TODO Kevin: Add spaceId in remote schema?
// TODO Kevin: Change remote.kibanaUrl to be optional? (since some summary document may not have it until kibana upgrade)
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

export function createRemoteSloDeleteUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const detailsPath = paths.sloDetails(
    slo.id,
    ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
  );

  const remoteUrl = new URL(path.join(spacePath, detailsPath), slo.remote.kibanaUrl);
  remoteUrl.searchParams.append('delete', 'true');

  return remoteUrl.toString();
}

export function createRemoteSloEditUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const editPath = paths.sloEdit(slo.id);
  const remoteUrl = new URL(path.join(spacePath, editPath), slo.remote.kibanaUrl);

  return remoteUrl.toString();
}

export function createRemoteSloCloneUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const clonePath = paths.sloCreateWithEncodedForm(
    encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })
  );
  const remoteUrl = new URL(path.join(spacePath, clonePath), slo.remote.kibanaUrl);
  return remoteUrl.toString();
}
