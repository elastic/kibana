/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';
import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/api/types';
import { ILM_POLICY_NAME } from '../../../common/constants';

export const reportingIlmPolicy: IlmPutLifecycleRequest['body'] = {
  policy: {
    phases: {
      hot: {
        actions: {},
      },
    },
  },
};

/**
 * Responsible for detecting and provisioning the reporting ILM policy.
 *
 * Uses the provided {@link ElasticsearchClient} to scope request privileges.
 */
export class ReportingIlmPolicyManager {
  constructor(private readonly client: ElasticsearchClient) {}

  public static create(opts: { client: ElasticsearchClient }) {
    return new ReportingIlmPolicyManager(opts.client);
  }

  public async doesIlmPolicyExist(): Promise<boolean> {
    try {
      await this.client.ilm.getLifecycle({ policy: ILM_POLICY_NAME });
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Create the Reporting ILM policy.
   */
  public async createIlmPolicy(): Promise<void> {
    await this.client.ilm.putLifecycle({
      policy: ILM_POLICY_NAME,
      body: reportingIlmPolicy,
    });
  }
}
