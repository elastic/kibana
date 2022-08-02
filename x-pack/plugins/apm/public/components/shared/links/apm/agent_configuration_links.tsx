/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '@kbn/core/public';
import { AgentConfigurationIntake } from '../../../../../common/agent_configuration/configuration_types';
import { getLegacyApmHref } from './apm_link';

export function editAgentConfigurationHref(
  configService: AgentConfigurationIntake['service'],
  search: string,
  basePath: IBasePath
) {
  return getLegacyApmHref({
    basePath,
    path: '/settings/agent-configuration/edit',
    search,
    query: {
      // ignoring because `name` has not been added to url params. Related: https://github.com/elastic/kibana/issues/51963
      // @ts-expect-error
      name: configService.name,
      environment: configService.environment,
    },
  });
}
