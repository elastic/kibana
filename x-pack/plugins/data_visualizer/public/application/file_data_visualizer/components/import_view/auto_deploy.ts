/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { HttpSetup } from '@kbn/core/public';

const POLL_INTERVAL = 5; // seconds

export class AutoDeploy {
  private inferError: Error | null = null;
  constructor(private readonly http: HttpSetup, private readonly inferenceId: string) {}

  public async deploy() {
    this.inferError = null;
    if (await this.isDeployed()) {
      return;
    }

    this.infer().catch((e) => {
      // ignore timeout errors
      // The deployment may take a long time
      // we'll know when it's ready from polling the inference endpoints
      // looking for num_allocations
      const status = e.response?.status;
      if (status === 408 || status === 504 || status === 502) {
        return;
      }
      this.inferError = e;
    });
    await this.pollIsDeployed();
  }

  private async infer() {
    return this.http.fetch<InferenceInferenceEndpointInfo[]>(
      `/internal/data_visualizer/inference/${this.inferenceId}`,
      {
        method: 'POST',
        version: '1',
        body: JSON.stringify({ input: '' }),
      }
    );
  }

  private async isDeployed() {
    const inferenceEndpoints = await this.http.fetch<InferenceInferenceEndpointInfo[]>(
      '/internal/data_visualizer/inference_endpoints',
      {
        method: 'GET',
        version: '1',
      }
    );
    return inferenceEndpoints.some((endpoint) => {
      return (
        endpoint.inference_id === this.inferenceId && endpoint.service_settings.num_allocations > 0
      );
    });
  }

  private async pollIsDeployed() {
    while (true) {
      if (this.inferError !== null) {
        throw this.inferError;
      }
      const isDeployed = await this.isDeployed();
      if (isDeployed) {
        // break out of the loop once we have a successful deployment
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL * 1000));
    }
  }
}
