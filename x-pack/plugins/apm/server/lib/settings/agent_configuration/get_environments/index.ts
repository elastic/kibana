/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAllEnvironments } from '../../../environments/get_all_environments';
import { Setup } from '../../../helpers/setup_request';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
import { getExistingEnvironmentsForService } from './get_existing_environments_for_service';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';

export type AgentConfigurationEnvironmentsAPIResponse = PromiseReturnType<
  typeof getEnvironments
>;

export async function getEnvironments({
  serviceName,
  setup,
}: {
  serviceName: string | undefined;
  setup: Setup;
}) {
  const [allEnvironments, existingEnvironments] = await Promise.all([
    getAllEnvironments({ serviceName, setup }),
    getExistingEnvironmentsForService({ serviceName, setup }),
  ]);

  return [ALL_OPTION_VALUE, ...allEnvironments].map((environment) => {
    return {
      name: environment,
      alreadyConfigured: existingEnvironments.includes(environment),
    };
  });
}
