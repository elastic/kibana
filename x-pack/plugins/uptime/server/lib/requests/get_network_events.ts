/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { NetworkEvent } from '../../../common/runtime_types';

export interface GetNetworkEventsParams {
  checkGroup: string;
  stepIndex: string;
}

export const secondsToMillis = (seconds: number) =>
  // -1 is a special case where a value was unavailable
  seconds === -1 ? -1 : seconds * 1000;

export const getNetworkEvents: UMElasticsearchQueryFn<
  GetNetworkEventsParams,
  { events: NetworkEvent[]; total: number; isWaterfallSupported: boolean }
> = async ({ uptimeEsClient, checkGroup, stepIndex }) => {
  const params = {
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          { term: { 'synthetics.type': 'journey/network_info' } },
          { term: { 'monitor.check_group': checkGroup } },
          { term: { 'synthetics.step.index': Number(stepIndex) } },
        ] as QueryDslQueryContainer[],
      },
    },
    // NOTE: This limit may need tweaking in the future. Users can technically perform multiple
    // navigations within one step, and may push up against this limit, however this manner
    // of usage isn't advised.
    size: 1000,
  };

  const { body: result } = await uptimeEsClient.search({ body: params });
  let isWaterfallSupported = false;
  const events = result.hits.hits.map<NetworkEvent>((event: any) => {
    if (event._source.http && event._source.url) {
      isWaterfallSupported = true;
    }
    const requestSentTime = secondsToMillis(event._source.synthetics.payload.request_sent_time);
    const loadEndTime = secondsToMillis(event._source.synthetics.payload.load_end_time);
    const securityDetails = event._source.tls?.server?.x509;

    return {
      timestamp: event._source['@timestamp'],
      method: event._source.http?.request?.method,
      url: event._source.url?.full,
      status: event._source.http?.response?.status,
      mimeType: event._source.http?.response?.mime_type,
      requestSentTime,
      loadEndTime,
      timings: event._source.synthetics.payload.timings,
      transferSize: event._source.synthetics.payload.transfer_size,
      resourceSize: event._source.synthetics.payload.resource_size,
      certificates: securityDetails
        ? {
            issuer: securityDetails.issuer?.common_name,
            subjectName: securityDetails.subject.common_name,
            validFrom: securityDetails.not_before,
            validTo: securityDetails.not_after,
          }
        : undefined,
      requestHeaders: event._source.http?.request?.headers,
      responseHeaders: event._source.http?.response?.headers,
      ip: event._source.http?.response?.remote_i_p_address,
    };
  });

  return {
    total: result.hits.total.value,
    events,
    isWaterfallSupported,
  };
};
