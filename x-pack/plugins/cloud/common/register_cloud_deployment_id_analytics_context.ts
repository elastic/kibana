/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { map, type Observable, of } from 'rxjs';
import type { EssDeploymentMetadata } from '../server/ess_metadata_service';

export function registerCloudDeploymentIdAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  cloudId?: string,
  deploymentMetadata$?: Observable<EssDeploymentMetadata>
) {
  if (!cloudId) {
    return;
  }
  analytics.registerContextProvider({
    name: 'Cloud ID',
    context$: of({ cloudId }),
    schema: {
      cloudId: {
        type: 'keyword',
        _meta: { description: 'The Cloud ID' },
      },
    },
  });

  if (deploymentMetadata$) {
    analytics.registerContextProvider({
      name: 'Cloud Deployment Metadata',
      context$: deploymentMetadata$.pipe(
        map(({ deploymentId, organizationId, isElasticStaffOrganization, inTrial }) => ({
          cloudDeploymentId: deploymentId,
          cloudOrganizationId: organizationId,
          isElasticStaffOrganization,
          inTrial,
        }))
      ),
      schema: {
        cloudDeploymentId: {
          type: 'keyword',
          _meta: { description: 'The Cloud Deployment ID' },
        },
        cloudOrganizationId: {
          type: 'keyword',
          _meta: { description: 'The Cloud Organization ID', optional: true },
        },
        isElasticStaffOrganization: {
          type: 'boolean',
          _meta: {
            description: '`true` if the deployment was created by an Elastician',
            optional: true,
          },
        },
        inTrial: {
          type: 'boolean',
          _meta: {
            description: '`true` if the organization is in a trial period on Cloud',
            optional: true,
          },
        },
      },
    });
  }
}
