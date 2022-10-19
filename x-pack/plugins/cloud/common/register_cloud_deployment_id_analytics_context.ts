/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { of } from 'rxjs';

export interface CloudDeploymentMetadata {
  id?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
}

export function registerCloudDeploymentMetadataAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  cloudMetadata: CloudDeploymentMetadata
) {
  if (!cloudMetadata.id) {
    return;
  }
  const {
    id: cloudId,
    trial_end_date: cloudTrialEndDate,
    is_elastic_staff_owned: cloudIsElasticStaffOwned,
  } = cloudMetadata;

  analytics.registerContextProvider({
    name: 'Cloud Deployment Metadata',
    context$: of({ cloudId, cloudTrialEndDate, cloudIsElasticStaffOwned }),
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
}
