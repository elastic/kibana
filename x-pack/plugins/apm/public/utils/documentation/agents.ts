/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc } from 'x-pack/plugins/apm/typings/es_schemas/APMDoc';
import { PropertyTabKey } from '../../components/shared/PropertiesTable/tabConfig';

const AGENT_URL_ROOT = 'https://www.elastic.co/guide/en/apm/agent';

type AgentName = APMDoc['agent']['name'];
type DocUrls = {
  [tabKey in PropertyTabKey]?: { [agentName in AgentName]: string | undefined }
};

const customUrls = {
  'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-custom-context`,
  'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-custom-context`,
  java: undefined,
  nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-custom-context`,
  python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-set-custom-context`,
  ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_adding_custom_context`
};

const AGENT_DOC_URLS: DocUrls = {
  user: {
    'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-user-context`,
    'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-user-context`,
    java: `${AGENT_URL_ROOT}/java/0.7/public-api.html#api-transaction-set-user`,
    nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-user-context`,
    python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-set-user-context`,
    ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_providing_info_about_the_user`
  },
  labels: {
    'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-tags`,
    'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-tags`,
    java: `${AGENT_URL_ROOT}/java/0.7/public-api.html#api-transaction-add-tag`,
    nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-tag`,
    python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-tag`,
    ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_adding_tags`
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
