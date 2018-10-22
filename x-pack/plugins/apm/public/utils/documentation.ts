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

// TODO: currently unused but should be added to timeline view
export const APM_AGENT_DROPPED_SPANS_DOCS = {
  nodejs: {
    url: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#transaction-max-spans`
  },
  python: {
    url: `${APM_URL_ROOT}/agent/python/2.x/configuration.html#config-transaction-max-spans`
  }
};

export const ELASTIC_DOCS = {
  'x-pack-emails': {
    url: `${XPACK_URL_ROOT}/actions-email.html#configuring-email`
  },
  'watcher-get-started': {
    url: `${XPACK_URL_ROOT}/watcher-getting-started.html`
  }
};

const featureContextUserText =
  'You can configure your agent to add contextual information about your users.';
const featureContextTagsText =
  'You can configure your agent to add filterable tags on transactions.';
const featureContextCustomText =
  'You can configure your agent to add custom contextual information on transactions.';

const APM_AGENT_FEATURE_DOCS: {
  [featureName: string]: {
    [agentName: string]: {
      url: string;
      text: string;
    };
  };
} = {
  user: {
    nodejs: {
      text: featureContextUserText,
      url: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-user-context`
    },
    python: {
      text: featureContextUserText,
      url: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-set-user-context`
    },
    ruby: {
      text: featureContextUserText,
      url: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_providing_info_about_the_user`
    },
    javascript: {
      text: featureContextUserText,
      url: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-user-context`
    }
  },
  tags: {
    nodejs: {
      text: featureContextTagsText,
      url: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-tag`
    },
    python: {
      text: featureContextTagsText,
      url: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-tag`
    },
    ruby: {
      text: featureContextTagsText,
      url: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_adding_tags`
    },
    javascript: {
      text: featureContextTagsText,
      url: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-tags`
    }
  },
  custom: {
    nodejs: {
      text: featureContextCustomText,
      url: `${APM_URL_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-custom-context`
    },
    python: {
      text: featureContextCustomText,
      url: `${APM_URL_ROOT}/agent/python/2.x/api.html#api-set-custom-context`
    },
    ruby: {
      text: featureContextCustomText,
      url: `${APM_URL_ROOT}/agent/ruby/1.x/advanced.html#_adding_custom_context`
    },
    javascript: {
      text: featureContextCustomText,
      url: `${APM_URL_ROOT}/agent/js-base/0.x/api.html#apm-set-custom-context`
    }
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

export function getAgentFeatureDocs(featureName: string, agentName?: string) {
  const translatedAgentName = translateAgentName(agentName);
  if (APM_AGENT_FEATURE_DOCS[featureName] && translatedAgentName) {
    return APM_AGENT_FEATURE_DOCS[featureName][translatedAgentName];
  }
}
