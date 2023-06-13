/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '@kbn/core-http-server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import moment from 'moment';
import { AlertsLocatorParams } from '../..';

export const getAlertUrl = async (
  alertUuid: string | null,
  spaceId: string,
  startedAt: string,
  alertsLocator?: LocatorPublic<AlertsLocatorParams>,
  publicBaseUrl?: string
) => {
  if (!publicBaseUrl || !alertsLocator || !alertUuid) return '';

  const rangeFrom = moment(startedAt).subtract('5', 'minute').toISOString();

  return (
    await alertsLocator.getLocation({
      baseUrl: publicBaseUrl,
      spaceId,
      kuery: `kibana.alert.uuid: "${alertUuid}"`,
      rangeFrom,
    })
  ).path;
};

export const getAlertDetailsUrl = (
  basePath: IBasePath,
  spaceId: string,
  alertUuid: string | null
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, `/app/observability/alerts/${alertUuid}`);
