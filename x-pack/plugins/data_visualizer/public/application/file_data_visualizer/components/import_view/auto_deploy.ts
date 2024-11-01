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
  private inferError: string | null = null;
  constructor(private http: HttpSetup, private inferenceId: string) {}

  public async deploy() {
    this.inferError = null;
    if (await this.isDeployed()) {
      return;
    }

    this.infer().catch((e) => {
      this.inferError = e.message;
    });
    await this.pollIsDeployed();
  }

  private async infer() {
    this.http.fetch<InferenceInferenceEndpointInfo[]>(
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
    let setDeploymentReady: (value: boolean) => void = () => {};
    let rejectWithError: (value: string) => void = () => {};

    const run = async () => {
      if (this.inferError) {
        rejectWithError(this.inferError);
      }

      const isDeployed = await this.isDeployed();
      if (isDeployed) {
        setDeploymentReady(true);
      } else {
        setTimeout(() => {
          run();
        }, POLL_INTERVAL * 1000);
      }
    };
    run();

    return new Promise((resolve, reject) => {
      setDeploymentReady = resolve;
      rejectWithError = reject;
    });
  }
}
