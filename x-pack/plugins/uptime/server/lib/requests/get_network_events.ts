/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  {
    events: NetworkEvent[];
    total: number;
    isWaterfallSupported: boolean;
    hasNavigationRequest: boolean;
  }
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
  let hasNavigationRequest = false;

  const events = result.hits.hits.map<NetworkEvent>((event: any) => {
    const docSource = event._source;

    if (docSource.http && docSource.url) {
      isWaterfallSupported = true;
    }
    const requestSentTime = secondsToMillis(docSource.synthetics.payload.request_sent_time);
    const loadEndTime = secondsToMillis(docSource.synthetics.payload.load_end_time);
    const securityDetails = docSource.tls?.server?.x509;

    if (docSource.synthetics.payload?.is_navigation_request) {
      // if step has navigation request, this means we will display waterfall metrics in ui
      hasNavigationRequest = true;
    }

    return {
      timestamp: docSource['@timestamp'],
      method: docSource.http?.request?.method,
      url: docSource.url?.full,
      status: docSource.http?.response?.status,
      mimeType: docSource.http?.response?.mime_type,
      requestSentTime,
      loadEndTime,
      timings: docSource.synthetics.payload.timings,
      transferSize: docSource.synthetics.payload.transfer_size,
      resourceSize: docSource.synthetics.payload.resource_size,
      certificates: securityDetails
        ? {
            issuer: securityDetails.issuer?.common_name,
            subjectName: securityDetails.subject.common_name,
            validFrom: securityDetails.not_before,
            validTo: securityDetails.not_after,
          }
        : undefined,
      requestHeaders: docSource.http?.request?.headers,
      responseHeaders: docSource.http?.response?.headers,
      ip: docSource.http?.response?.remote_i_p_address,
    };
  });

  return {
    total: result.hits.total.value,
    events,
    isWaterfallSupported,
    hasNavigationRequest,
  };
};
