/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  catchError,
  exhaustMap,
  type Observable,
  shareReplay,
  Subject,
  takeUntil,
  timer,
} from 'rxjs';
import type { Logger } from '@kbn/logging';
import { EssDeploymentMetadata } from '../../common/types';
import { EssApi, type EssApiConfiguration } from './ess_api';

export interface EssMetadataServiceConfig {
  deploymentId: string;
  cache_ttl: number;
  ess_api: EssApiConfiguration;
}

/**
 * Service fetching and caching the metadata of a deployment on Cloud
 */
export class EssMetadataService {
  public readonly cachedMetadata$: Observable<EssDeploymentMetadata>;
  private readonly stop$ = new Subject<void>();
  private readonly essApiClient: EssApi;
  private readonly cacheTtl: number;
  constructor(config: EssMetadataServiceConfig, private readonly logger: Logger) {
    this.essApiClient = new EssApi(config.ess_api);
    this.cacheTtl = config.cache_ttl;

    this.cachedMetadata$ = timer(0, this.cacheTtl).pipe(
      takeUntil(this.stop$),
      exhaustMap(async () => {
        return await this.getDeploymentMetadata(config.deploymentId);
      }),
      catchError(async (err) => {
        this.logger.error(err);
        return { deploymentId: config.deploymentId };
      }),
      shareReplay(1)
    );
  }

  public async stop() {
    this.stop$.next();
  }

  private async getDeploymentMetadata(deploymentId: string): Promise<EssDeploymentMetadata> {
    const { metadata } = await this.essApiClient.getDeploymentById(deploymentId);
    const organizationId = metadata?.organization_id;
    if (!organizationId) {
      this.logger.error(
        `"metadata.organization_id" is not present for deployment ID ${deploymentId}`
      );
      return { deploymentId };
    }

    let inTrial: boolean | undefined;
    let isElasticStaffOrganization: boolean | undefined;
    try {
      const organizationInfo = await this.essApiClient.getOrganizationById(organizationId);
      inTrial = organizationInfo.in_trial;
      isElasticStaffOrganization = organizationInfo.is_elastic_staff_organization;
    } catch (err) {
      this.logger.error(`Error retrieving the organization details`, { error: err });
    }

    return {
      deploymentId,
      organizationId,
      inTrial,
      isElasticStaffOrganization,
    };
  }
}
