/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  GetRecommendationsRequestQuery,
  getRecommendationsRequestQueryRT,
  GetRecommendationsResponsePayload,
  getRecommendationsResponsePayloadRT,
} from '../../../common/latest';
import {
  DecodeRecommendationsError,
  FetchRecommendationsError,
  GET_RECOMMENDATIONS_URL,
  SIMULATE_PIPELINE_URL,
} from '../../../common/recommendations';
import { decodeOrThrow } from '../../../common/runtime_types';
import { IRecommendationsClient } from './types';

export class RecommendationsClient implements IRecommendationsClient {
  constructor(private readonly http: HttpStart) {}

  public async find(
    params: GetRecommendationsRequestQuery
  ): Promise<GetRecommendationsResponsePayload> {
    const query = getRecommendationsRequestQueryRT.encode(params);

    const response = await this.http
      .get(GET_RECOMMENDATIONS_URL, { query, version: '1' })
      .catch((error) => {
        throw new FetchRecommendationsError(
          `Failed to fetch recommendations for data stream "${query.dataStream}": ${error.message}`
        );
      });

    const data = decodeOrThrow(
      getRecommendationsResponsePayloadRT,
      (message: string) =>
        new DecodeRecommendationsError(
          `Failed decoding recommendations for data stream "${query.dataStream}": ${message}`
        )
    )(response);

    return data;
  }

  public async simulatePipeline(body) {
    const response = await this.http
      .post(SIMULATE_PIPELINE_URL, { body: JSON.stringify(body), version: '1' })
      .catch((error) => {
        throw new FetchRecommendationsError(`Failed to simulate pipeline: ${error.message}`);
      });

    // const data = decodeOrThrow(
    //   getRecommendationsResponsePayloadRT,
    //   (message: string) =>
    //     new DecodeRecommendationsError(
    //       `Failed decoding recommendations for dataset "${query.dataset}": ${message}`
    //     )
    // )(response);

    return response;
  }
}
