/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ILM_POLICY_NAME } from '@kbn/reporting-common';
import { IlmPolicyMigrationStatus } from '@kbn/reporting-common/types';
import {
  REPORTING_DATA_STREAM_COMPONENT_TEMPLATE,
  REPORTING_DATA_STREAM_WILDCARD,
} from '@kbn/reporting-server';

/**
 * Responsible for detecting and provisioning the reporting ILM policy in stateful deployments.
 *
 * Uses the provided {@link ElasticsearchClient} to scope request privileges.
 */
export class IlmPolicyManager {
  constructor(private readonly client: ElasticsearchClient) {}

  public static create(opts: { client: ElasticsearchClient }) {
    return new IlmPolicyManager(opts.client);
  }

  /**
   * Check that the ILM policy exists
   */
  public async doesIlmPolicyExist(): Promise<boolean> {
    const reportingIlmGetLifecycleRequest: estypes.IlmGetLifecycleRequest = {
      name: ILM_POLICY_NAME,
    };
    try {
      await this.client.ilm.getLifecycle(reportingIlmGetLifecycleRequest);
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

    // FIXME: should also check if legacy indices exist
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
    const reportingIlmPutLifecycleRequest: estypes.IlmPutLifecycleRequest = {
      name: ILM_POLICY_NAME,
      policy: {
        phases: {
          hot: {
            actions: {},
          },
        },
      },
    };

    await this.client.ilm.putLifecycle(reportingIlmPutLifecycleRequest);
  }

  /**
   * Update the Data Stream index template with a link to the Reporting ILM policy
   */
  public async linkIlmPolicy(): Promise<void> {
    const reportingIndicesPutTemplateRequest: estypes.ClusterPutComponentTemplateRequest = {
      name: REPORTING_DATA_STREAM_COMPONENT_TEMPLATE,
      template: {
        settings: {
          lifecycle: {
            name: ILM_POLICY_NAME,
          },
        },
      },
      create: false,
    };

    await this.client.cluster.putComponentTemplate(reportingIndicesPutTemplateRequest);
  }

  /**
   * Update existing index settings to use ILM policy
   *
   * FIXME: should also migrate legacy indices, if any exist
   */
  public async migrateIndicesToIlmPolicy() {
    const indicesPutSettingsRequest: estypes.IndicesPutSettingsRequest = {
      index: REPORTING_DATA_STREAM_WILDCARD,
      settings: {
        lifecycle: {
          name: ILM_POLICY_NAME,
        },
      },
    };

    await this.client.indices.putSettings(indicesPutSettingsRequest);
  }
}
