/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentName } from '../../../typings/es_schemas/ui/fields/Agent';
import { PropertyTabKey } from '../../components/shared/PropertiesTable/tabConfig';

const AGENT_URL_ROOT = 'https://www.elastic.co/guide/en/apm/agent';

type DocUrls = {
  [tabKey in PropertyTabKey]?: { [agentName in AgentName]: string | undefined }
};

const customUrls = {
  'js-base': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-set-custom-context`,
  'rum-js': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-set-custom-context`,
  java: undefined,
  nodejs: `${AGENT_URL_ROOT}/nodejs/2.x/agent-api.html#apm-set-custom-context`,
  python: `${AGENT_URL_ROOT}/python/4.x/api.html#api-set-custom-context`,
  dotnet: undefined,
  ruby: `${AGENT_URL_ROOT}/ruby/2.x/context.html#_adding_custom_context`,
  go: undefined
};

const AGENT_DOC_URLS: DocUrls = {
  user: {
    'js-base': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-set-user-context`,
    'rum-js': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-set-user-context`,
    java: `${AGENT_URL_ROOT}/java/1.x/public-api.html#api-transaction-set-user`,
    nodejs: `${AGENT_URL_ROOT}/nodejs/2.x/agent-api.html#apm-set-user-context`,
    python: `${AGENT_URL_ROOT}/python/4.x/api.html#api-set-user-context`,
    dotnet: undefined,
    ruby: `${AGENT_URL_ROOT}/ruby/2.x/context.html#_providing_info_about_the_user`,
    go: undefined
  },
  labels: {
    'js-base': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-add-tags`,
    'rum-js': `${AGENT_URL_ROOT}/js-base/4.x/api.html#apm-add-tags`,
    java: `${AGENT_URL_ROOT}/java/1.x/public-api.html#api-transaction-add-tag`,
    nodejs: `${AGENT_URL_ROOT}/nodejs/2.x/agent-api.html#apm-set-tag`,
    python: `${AGENT_URL_ROOT}/python/4.x/api.html#api-tag`,
    dotnet: `${AGENT_URL_ROOT}/dotnet/current/public-api.html#api-transaction-tags`,
    ruby: `${AGENT_URL_ROOT}/ruby/2.x/context.html#_adding_tags`,
    go: undefined
  },
  'transaction.custom': customUrls,
  'error.custom': customUrls
};

export function getAgentDocUrlForTab(
  tabKey: PropertyTabKey,
  agentName?: AgentName
) {
  const agentUrls = AGENT_DOC_URLS[tabKey];
  if (agentUrls && agentName) {
    return agentUrls[agentName];
  }
}
