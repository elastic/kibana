/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { toQuery } from '../../../../shared/Links/url_helpers';
import { Settings } from '../../../Settings';
import { AgentConfigurationCreateEdit } from '../../../Settings/AgentConfigurations/AgentConfigurationCreateEdit';

type EditAgentConfigurationRouteHandler = RouteComponentProps<{}>;

export function EditAgentConfigurationRouteHandler(
  props: EditAgentConfigurationRouteHandler
) {
  const { search } = props.history.location;

  // typescript complains because `pageStop` does not exist in `APMQueryParams`
  // Going forward we should move away from globally declared query params and this is a first step
  // @ts-expect-error
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
    <Settings {...props}>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-settings-step'}
        existingConfigResult={res}
      />
    </Settings>
  );
}

type CreateAgentConfigurationRouteHandlerProps = RouteComponentProps<{}>;

export function CreateAgentConfigurationRouteHandler(
  props: CreateAgentConfigurationRouteHandlerProps
) {
  const { search } = props.history.location;

  // Ignoring here because we specifically DO NOT want to add the query params to the global route handler
  // @ts-expect-error
  const { pageStep } = toQuery(search);

  return (
    <Settings {...props}>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-service-step'}
      />
    </Settings>
  );
}
