/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { metadata } from 'ui/metadata';

const STACK_VERSION = metadata.branch;
const APM_URL_ROOT = 'https://www.elastic.co/guide/en/apm';
const XPACK_URL_ROOT = `https://www.elastic.co/guide/en/x-pack/${STACK_VERSION}`;

export const XPACK_DOCS = {
  xpackEmails: `${XPACK_URL_ROOT}/actions-email.html#configuring-email`,
  xpackWatcher: `${XPACK_URL_ROOT}/watcher-getting-started.html`
};

// TODO: currently unused but should be added to timeline view
export const APM_AGENT_DROPPED_SPANS_DOCS = {
  nodejs: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#transaction-max-spans`,
  python: `${APM_URL_ROOT}/agent/python/2.x/configuration.html#config-transaction-max-spans`
};

const APM_AGENT_FEATURE_DOCS: {
  [featureName: string]: {
    [agentName: string]: string;
  };
} = {
  user: {
    nodejs: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-user-context`,
    python: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-set-user-context`,
    ruby: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_providing_info_about_the_user`,
    javascript: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-user-context`
  },
  tags: {
    nodejs: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-tag`,
    python: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-tag`,
    ruby: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_adding_tags`,
    javascript: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-tags`
  },
  custom: {
    nodejs: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-custom-context`,
    python: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-set-custom-context`,
    ruby: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_adding_custom_context`,
    javascript: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-custom-context`
  }
};

function translateAgentName(agentName?: string) {
  switch (agentName) {
    case 'js-react':
    case 'js-base':
      return 'javascript';

    default:
      return agentName;
  }
}

export function getAgentFeatureDocsUrl(
  featureName: string,
  agentName?: string
) {
  const translatedAgentName = translateAgentName(agentName);
  if (APM_AGENT_FEATURE_DOCS[featureName] && translatedAgentName) {
    return APM_AGENT_FEATURE_DOCS[featureName][translatedAgentName];
  }
}
