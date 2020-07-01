/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../../observability/typings/common';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { APMUIDocumentType } from '../../helpers/get_es_client/document_types';

export type AgentConfigurationListAPIResponse = PromiseReturnType<
  typeof listConfigurations
>;
export async function listConfigurations({ setup }: { setup: Setup }) {
  const { internalClient } = setup;

  const params = {
    apm: {
      types: [APMUIDocumentType.agentConfiguration],
    },
    size: 200,
  };

  const resp = await internalClient.search<AgentConfiguration>(params);
  return resp.hits.hits
    .map(convertConfigSettingsToString)
    .map((hit) => hit._source);
}
