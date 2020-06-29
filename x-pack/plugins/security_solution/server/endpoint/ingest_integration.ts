/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { NewPackageConfig } from '../../../ingest_manager/common/types/models';

/**
 * Callback to handle creation of package configs in Ingest Manager
 * @param newPackageConfig
 */
export const handlePackageConfigCreate = async (
  newPackageConfig: NewPackageConfig
): Promise<NewPackageConfig> => {
  // We only care about Endpoint package configs
  if (newPackageConfig.package?.name !== 'endpoint') {
    return newPackageConfig;
  }

  // We cast the type here so that any changes to the Endpoint specific data
  // follow the types/schema expected
  let updatedPackageConfig = newPackageConfig as NewPolicyData;

  // Until we get the Default Policy Configuration in the Endpoint package,
  // we will add it here manually at creation time.
  // @ts-ignore
  if (newPackageConfig.inputs.length === 0) {
    updatedPackageConfig = {
      ...newPackageConfig,
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            policy: {
              value: policyConfigFactory(),
            },
          },
        },
      ],
    };
  }

  return updatedPackageConfig;
};
