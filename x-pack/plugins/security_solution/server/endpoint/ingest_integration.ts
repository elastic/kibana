/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { NewDatasource } from '../../../ingest_manager/common/types/models';

/**
 * Callback to handle creation of Datasources in Ingest Manager
 * @param newDatasource
 */
export const handleDatasourceCreate = async (
  newDatasource: NewDatasource
): Promise<NewDatasource> => {
  // We only care about Endpoint datasources
  if (newDatasource.package?.name !== 'endpoint') {
    return newDatasource;
  }

  // We cast the type here so that any changes to the Endpoint specific data
  // follow the types/schema expected
  let updatedDatasource = newDatasource as NewPolicyData;

  // Until we get the Default Policy Configuration in the Endpoint package,
  // we will add it here manually at creation time.
  // @ts-ignore
  if (newDatasource.inputs.length === 0) {
    updatedDatasource = {
      ...newDatasource,
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

  return updatedDatasource;
};
