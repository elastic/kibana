/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { NetworkEvent } from '../../../common/runtime_types';

interface GetNetworkEventsParams {
  checkGroup: string;
  stepIndex: string;
}

export const secondsToMillis = (seconds: number) =>
  // -1 is a special case where a value was unavailable
  seconds === -1 ? -1 : seconds * 1000;

export const getNetworkEvents: UMElasticsearchQueryFn<
  GetNetworkEventsParams,
  { events: NetworkEvent[]; total: number }
> = async ({ uptimeEsClient, checkGroup, stepIndex }) => {
  const params = {
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          { term: { 'synthetics.type': 'journey/network_info' } },
          { term: { 'monitor.check_group': checkGroup } },
          { term: { 'synthetics.step.index': Number(stepIndex) } },
        ],
      },
    },
    // NOTE: This limit may need tweaking in the future. Users can technically perform multiple
    // navigations within one step, and may push up against this limit, however this manner
    // of usage isn't advised.
    size: 1000,
  };

  const { body: result } = await uptimeEsClient.search({ body: params });

  return {
    total: result.hits.total.value,
    events: result.hits.hits.map<NetworkEvent>((event: any) => {
      const requestSentTime = secondsToMillis(event._source.synthetics.payload.request_sent_time);
      const loadEndTime = secondsToMillis(event._source.synthetics.payload.load_end_time);
      const requestStartTime =
        event._source.synthetics.payload.response &&
        event._source.synthetics.payload.response.timing
          ? secondsToMillis(event._source.synthetics.payload.response.timing.request_time)
          : undefined;

      return {
        timestamp: event._source['@timestamp'],
        method: event._source.synthetics.payload?.method,
        url: event._source.synthetics.payload?.url,
        status: event._source.synthetics.payload?.status,
        mimeType: event._source.synthetics.payload?.response?.mime_type,
        requestSentTime,
        requestStartTime,
        loadEndTime,
        timings: event._source.synthetics.payload.timings,
      };
    }),
  };
};
