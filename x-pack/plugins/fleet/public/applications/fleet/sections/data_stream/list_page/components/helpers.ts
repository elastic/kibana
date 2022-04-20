/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { Overwrite } from 'utility-types';
import moment from 'moment';

import type { DataStream } from '../../../../types';

type APMDataStream = Overwrite<
  DataStream,
  { package: 'apm'; serviceDetails: NonNullable<DataStream['serviceDetails']> }
>;

export const isAPMIntegration = (datastream: DataStream): datastream is APMDataStream =>
  Boolean(datastream.package === 'apm' && datastream.serviceDetails);

const mapDataStreamTypePageId = (datastreamType: string) => {
  const mapObj = {
    logs: 'serviceLogsOverview',
    metrics: 'serviceMetricsOverview',
    traces: 'serviceTransactionsOverview',
    default: 'serviceOverview',
  } as const;
  return mapObj[datastreamType as keyof typeof mapObj] || mapObj.default;
};

export const getAPMServicenHrefFor = async (
  datastream: DataStream,
  ampLocator: LocatorPublic<SerializableRecord> | undefined
) => {
  if (!isAPMIntegration(datastream)) return;

  const { serviceName, environment } = datastream.serviceDetails;
  const rangeFromQuery = moment(datastream.last_activity_ms).subtract(1, 'day').toISOString();
  const locatorPageId = mapDataStreamTypePageId(datastream.type);

  return ampLocator?.getUrl({
    pageId: locatorPageId,
    params: { serviceName },
    query: {
      environment,
      rangeFrom: rangeFromQuery,
    },
  });
};
