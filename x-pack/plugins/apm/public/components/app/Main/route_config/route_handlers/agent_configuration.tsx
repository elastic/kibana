/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { history } from '../../../../../utils/history';
import { Settings } from '../../../Settings';
import { AgentConfigurationCreateEdit } from '../../../Settings/AgentConfigurations/AgentConfigurationCreateEdit';
import { toQuery } from '../../../../shared/Links/url_helpers';

export function EditAgentConfigurationRouteHandler() {
  const { search } = history.location;

  // typescript complains because `pageStop` does not exist in `APMQueryParams`
  // Going forward we should move away from globally declared query params and this is a first step
  // @ts-ignore
  const { name, environment, pageStep } = toQuery(search);

  const res = useFetcher(
    (callApmApi) => {
      return callApmApi({
        pathname: '/api/apm/settings/agent-configuration/view',
        params: { query: { name, environment } },
      });
    },
    [name, environment]
  );

  return (
    <Settings>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-settings-step'}
        existingConfigResult={res}
      />
    </Settings>
  );
}

export function CreateAgentConfigurationRouteHandler() {
  const { search } = history.location;

  // Ignoring here because we specifically DO NOT want to add the query params to the global route handler
  // @ts-ignore
  const { pageStep } = toQuery(search);

  return (
    <Settings>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-service-step'}
      />
    </Settings>
  );
}
