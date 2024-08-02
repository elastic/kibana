/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { CreateAPIKeyParams } from '@kbn/security-plugin/server';

/**
 * Creates a short lived API key with the necessary permissions to install integrations
 */
export function createInstallApiKey(name: string): CreateAPIKeyParams {
  return {
    name,
    expiration: '1h', // This API key is only used for initial setup and should be short lived
    metadata: {
      managed: true,
      application: 'logs',
    },
    kibana_role_descriptors: {
      can_install_integrations: {
        elasticsearch: {
          cluster: [],
          indices: [],
        },
        kibana: [
          {
            feature: {
              fleet: ['all'],
              fleetv2: ['all'], // TODO: Remove this once #183020 is resolved
            },
            spaces: [ALL_SPACES_ID],
          },
        ],
      },
    },
  };
}
