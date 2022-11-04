/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable, of } from 'rxjs';
import type { AnalyticsClient } from '@kbn/analytics-client';

export interface CloudDeploymentMetadata {
  cloudId?: string;
  trialEndDate?: Date;
  isElasticStaffOwned?: boolean;
  inTrial$?: Observable<boolean>;
  isPaying$?: Observable<boolean>;
}

export function registerCloudDeploymentMetadataAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  cloudMetadata: CloudDeploymentMetadata
) {
  if (!cloudMetadata.cloudId) {
    return;
  }
  const {
    cloudId,
    trialEndDate,
    isElasticStaffOwned: cloudIsElasticStaffOwned,
    isPaying$,
    inTrial$,
  } = cloudMetadata;

  analytics.registerContextProvider({
    name: 'Cloud Deployment Static Metadata',
    context$: of({
      cloudId,
      cloudTrialEndDate: trialEndDate?.toISOString(),
      cloudIsElasticStaffOwned,
    }),
    schema: {
      cloudId: {
        type: 'keyword',
        _meta: { description: 'The Cloud Deployment ID' },
      },
      cloudTrialEndDate: {
        type: 'date',
        _meta: { description: 'When the Elastic Cloud trial ends/ended', optional: true },
      },
      cloudIsElasticStaffOwned: {
        type: 'boolean',
        _meta: {
          description: '`true` if the owner of the deployment is an Elastician',
          optional: true,
        },
      },
    },
  });

  if (inTrial$) {
    analytics.registerContextProvider({
      name: 'Cloud Deployment Dynamic Metadata - inTrial',
      context$: inTrial$.pipe(map((cloudInTrial) => ({ cloudInTrial }))),
      schema: {
        cloudInTrial: {
          type: 'boolean',
          _meta: {
            description: 'Whether the Elastic Cloud organization is in trial',
          },
        },
      },
    });
  }

  if (isPaying$) {
    analytics.registerContextProvider({
      name: 'Cloud Deployment Dynamic Metadata - isPaying',
      context$: isPaying$.pipe(map((cloudIsPaying) => ({ cloudIsPaying }))),
      schema: {
        cloudIsPaying: {
          type: 'boolean',
          _meta: {
            description: 'Whether the Elastic Cloud organization is a paying customer',
          },
        },
      },
    });
  }
}
