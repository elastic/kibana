/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ILM_POLICY_NAME } from '@kbn/reporting-common';
import { IlmPolicyMigrationStatus } from '@kbn/reporting-common/types';
import { REPORTING_DATA_STREAM, REPORTING_DATA_STREAM_WILDCARD } from '@kbn/reporting-server';
import { reportingIlmPolicy, reportingIndexTemplate } from './constants';

/**
 * Responsible for detecting and provisioning the reporting ILM policy in stateful deployments.
 * Must be linked to the data stream once it is created.
 *
 * Uses the provided {@link ElasticsearchClient} to scope request privileges.
 */
export class IlmPolicyManager {
  constructor(private readonly client: ElasticsearchClient) {}

  public static create(opts: { client: ElasticsearchClient }) {
    return new IlmPolicyManager(opts.client);
  }

  public async doesIlmPolicyExist(): Promise<boolean> {
    try {
      await this.client.ilm.getLifecycle({ name: ILM_POLICY_NAME });
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  public async checkIlmMigrationStatus(): Promise<IlmPolicyMigrationStatus> {
    if (!(await this.doesIlmPolicyExist())) {
      return 'policy-not-found';
    }

    // FIXME: should also check that template has link to ILM policy
    // FIXME: should also check legacy indices, if any exist
    const reportingIndicesSettings = await this.client.indices.getSettings({
      index: REPORTING_DATA_STREAM_WILDCARD,
    });

    const hasUnmanagedIndices = Object.values(reportingIndicesSettings).some((settings) => {
      return (
        settings?.settings?.index?.lifecycle?.name !== ILM_POLICY_NAME &&
        settings?.settings?.['index.lifecycle']?.name !== ILM_POLICY_NAME
      );
    });

    return hasUnmanagedIndices ? 'indices-not-managed-by-policy' : 'ok';
  }

  /**
   * Create the Reporting ILM policy
   */
  public async createIlmPolicy(): Promise<void> {
    await this.client.ilm.putLifecycle({
      name: ILM_POLICY_NAME,
      body: reportingIlmPolicy,
    });
  }

  /**
   * Link the Reporting ILM policy to the Data Stream index template
   */
  public async linkIlmPolicy(): Promise<void> {
    await this.client.indices.putIndexTemplate({
      name: REPORTING_DATA_STREAM,
      body: reportingIndexTemplate,
    });
  }
}
