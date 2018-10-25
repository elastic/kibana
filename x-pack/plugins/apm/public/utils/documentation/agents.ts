/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const AGENT_URL_ROOT = 'https://www.elastic.co/guide/en/apm/agent';

// TODO: currently unused but should be added to timeline view
export const APM_AGENT_DROPPED_SPANS_DOCS = {
  nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#transaction-max-spans`,
  python: `${AGENT_URL_ROOT}/python/2.x/configuration.html#config-transaction-max-spans`
};

const APM_AGENT_FEATURE_DOCS: {
  [featureName: string]: {
    [agentName: string]: string;
  };
} = {
  user: {
    nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-user-context`,
    python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-set-user-context`,
    ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_providing_info_about_the_user`,
    'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-user-context`,
    'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-user-context`
  },
  tags: {
    nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-tag`,
    python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-tag`,
    ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_adding_tags`,
    'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-tags`,
    'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-tags`
  },
  custom: {
    nodejs: `${AGENT_URL_ROOT}/nodejs/1.x/agent-api.html#apm-set-custom-context`,
    python: `${AGENT_URL_ROOT}/python/2.x/api.html#api-set-custom-context`,
    ruby: `${AGENT_URL_ROOT}/ruby/1.x/advanced.html#_adding_custom_context`,
    'js-react': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-custom-context`,
    'js-base': `${AGENT_URL_ROOT}/js-base/0.x/api.html#apm-set-custom-context`
  }
};

export function getAgentFeatureDocsUrl(
  featureName: string,
  agentName?: string
) {
  if (APM_AGENT_FEATURE_DOCS[featureName] && agentName) {
    return APM_AGENT_FEATURE_DOCS[featureName][agentName];
  }
}
