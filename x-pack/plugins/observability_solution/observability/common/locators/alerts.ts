/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';
import rison from '@kbn/rison';
import { url as urlUtils } from '@kbn/kibana-utils-plugin/common';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { alertsLocatorID } from '..';
import { ALERTS_URL_STORAGE_KEY } from '../constants';
import type { AlertStatus } from '../typings';

export interface AlertsLocatorParams extends SerializableRecord {
  baseUrl: string;
  spaceId: string;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  status?: AlertStatus;
}

export const ALERTS_PATH = '/app/observability/alerts';

function fromQuery(query: Record<string, any>) {
  const encodedQuery = urlUtils.encodeQuery(query, (value) =>
    encodeURIComponent(value).replace(/%3A/g, ':')
  );

  return stringify(encodedQuery, { sort: false, encode: false });
}

export class AlertsLocatorDefinition implements LocatorDefinition<AlertsLocatorParams> {
  public readonly id = alertsLocatorID;

  public readonly getLocation = async ({
    baseUrl,
    spaceId,
    kuery,
    rangeTo,
    rangeFrom,
    status,
  }: AlertsLocatorParams) => {
    const appState: {
      rangeFrom?: string;
      rangeTo?: string;
      kuery?: string;
      status?: AlertStatus;
    } = {};

    appState.rangeFrom = rangeFrom || 'now-15m';
    appState.rangeTo = rangeTo || 'now';
    appState.kuery = kuery || '';
    appState.status = status || 'all';

    const path = addSpaceIdToPath(baseUrl, spaceId, ALERTS_PATH);
    const url = new URL(path);
    url.search = fromQuery({ [ALERTS_URL_STORAGE_KEY]: rison.encodeUnknown(appState) });

    return {
      app: 'observability',
      path: url.href,
      state: {},
    };
  };
}
