/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAPMHref } from './APMLink';
import { AgentConfigurationIntake } from '../../../../../common/agent_configuration/configuration_types';
import { history } from '../../../../utils/history';

export function editAgentConfigurationHref(
  configService: AgentConfigurationIntake['service']
) {
  const { search } = history.location;
  return getAPMHref('/settings/agent-configuration/edit', search, {
    // ignoring because `name` has not been added to url params. Related: https://github.com/elastic/kibana/issues/51963
    // @ts-ignore
    name: configService.name,
    environment: configService.environment,
  });
}

export function createAgentConfigurationHref() {
  const { search } = history.location;
  return getAPMHref('/settings/agent-configuration/create', search);
}
