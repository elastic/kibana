/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  CreateMetricsExplorerViewAttributesRequestPayload,
  createMetricsExplorerViewRequestPayloadRT,
  findMetricsExplorerViewResponsePayloadRT,
  getMetricsExplorerViewUrl,
  metricsExplorerViewResponsePayloadRT,
  UpdateMetricsExplorerViewAttributesRequestPayload,
} from '../../../common/http_api/latest';
import {
  DeleteMetricsExplorerViewError,
  FetchMetricsExplorerViewError,
  MetricsExplorerView,
  UpsertMetricsExplorerViewError,
} from '../../../common/metrics_explorer_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { IMetricsExplorerViewsClient } from './types';

export class MetricsExplorerViewsClient implements IMetricsExplorerViewsClient {
  constructor(private readonly http: HttpStart) {}

  async findMetricsExplorerViews(): Promise<MetricsExplorerView[]> {
    const response = await this.http.get(getMetricsExplorerViewUrl()).catch((error) => {
      throw new FetchMetricsExplorerViewError(`Failed to fetch metrics explorer views: ${error}`);
    });

    const { data } = decodeOrThrow(
      findMetricsExplorerViewResponsePayloadRT,
      (message: string) =>
        new FetchMetricsExplorerViewError(`Failed to decode metrics explorer views: ${message}"`)
    )(response);

    return data;
  }

  async getMetricsExplorerView(metricsExplorerViewId: string): Promise<MetricsExplorerView> {
    const response = await this.http
      .get(getMetricsExplorerViewUrl(metricsExplorerViewId))
      .catch((error) => {
        throw new FetchMetricsExplorerViewError(
          `Failed to fetch metrics explorer view "${metricsExplorerViewId}": ${error}`
        );
      });

    const { data } = decodeOrThrow(
      metricsExplorerViewResponsePayloadRT,
      (message: string) =>
        new FetchMetricsExplorerViewError(
          `Failed to decode metrics explorer view "${metricsExplorerViewId}": ${message}"`
        )
    )(response);

    return data;
  }

  async createMetricsExplorerView(
    metricsExplorerViewAttributes: CreateMetricsExplorerViewAttributesRequestPayload
  ): Promise<MetricsExplorerView> {
    const response = await this.http
      .post(getMetricsExplorerViewUrl(), {
        body: JSON.stringify(
          createMetricsExplorerViewRequestPayloadRT.encode({
            attributes: metricsExplorerViewAttributes,
          })
        ),
      })
      .catch((error) => {
        throw new UpsertMetricsExplorerViewError(
          `Failed to create new metrics explorer view: ${error}`
        );
      });

    const { data } = decodeOrThrow(
      metricsExplorerViewResponsePayloadRT,
      (message: string) =>
        new UpsertMetricsExplorerViewError(
          `Failed to decode newly written metrics explorer view: ${message}"`
        )
    )(response);

    return data;
  }

  async updateMetricsExplorerView(
    metricsExplorerViewId: string,
    metricsExplorerViewAttributes: UpdateMetricsExplorerViewAttributesRequestPayload
  ): Promise<MetricsExplorerView> {
    const response = await this.http
      .put(getMetricsExplorerViewUrl(metricsExplorerViewId), {
        body: JSON.stringify(
          createMetricsExplorerViewRequestPayloadRT.encode({
            attributes: metricsExplorerViewAttributes,
          })
        ),
      })
      .catch((error) => {
        throw new UpsertMetricsExplorerViewError(
          `Failed to update metrics explorer view "${metricsExplorerViewId}": ${error}`
        );
      });

    const { data } = decodeOrThrow(
      metricsExplorerViewResponsePayloadRT,
      (message: string) =>
        new UpsertMetricsExplorerViewError(
          `Failed to decode updated metrics explorer view "${metricsExplorerViewId}": ${message}"`
        )
    )(response);

    return data;
  }

  deleteMetricsExplorerView(metricsExplorerViewId: string): Promise<null> {
    return this.http
      .delete(getMetricsExplorerViewUrl(metricsExplorerViewId))
      .then(() => null)
      .catch((error) => {
        throw new DeleteMetricsExplorerViewError(
          `Failed to delete metrics explorer view "${metricsExplorerViewId}": ${error}`
        );
      });
  }
}
