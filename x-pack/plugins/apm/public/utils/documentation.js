/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

const STACK_VERSION = '6.3';
const DOCS_ROOT = 'https://www.elastic.co/guide/en/apm';

//
// General APM
//
export const APM_DOCS = {
  'get-started': {
    url: `${DOCS_ROOT}/get-started/${STACK_VERSION}/index.html`
  }
};

//
// APM Server docs
//
export const APM_SERVER_DOCS = {
  download: {
    url: 'https://www.elastic.co/downloads/apm/apm-server'
  },
  configuring: {
    url: `${DOCS_ROOT}/server/${STACK_VERSION}/configuring.html`
  },
  'running-on-docker': {
    url: `${DOCS_ROOT}/server/${STACK_VERSION}/running-on-docker.html#running-on-docker`
  },
  frontend: {
    url: `${DOCS_ROOT}/server/${STACK_VERSION}/frontend.html`
  }
};

//
// APM Agents docs
//
const featureContextUserText =
  'You can configure your agent to add contextual information about your users.';
const featureContextTagsText =
  'You can configure your agent to add filterable tags on transactions.';
const featureContextCustomText =
  'You can configure your agent to add custom contextual information on transactions.';

export const APM_AGENT_DOCS = {
  home: {
    nodejs: {
      url: `${DOCS_ROOT}/agent/nodejs/1.x/index.html`
    },
    python: {
      url: `${DOCS_ROOT}/agent/python/2.x/index.html`
    },
    ruby: {
      url: `${DOCS_ROOT}/agent/ruby/1.x/index.html`
    },
    javascript: {
      url: `${DOCS_ROOT}/agent/js-base/0.x/index.html`
    }
  },
  'get-started': {
    python: {
      url: `${DOCS_ROOT}/agent/python/2.x/getting-started.html`
    },
    javascript: {
      url: `${DOCS_ROOT}/agent/js-base/0.x/getting-started.html`
    }
  },
  'nodejs-only': {
    'babel-es-modules': {
      url: `${DOCS_ROOT}/agent/nodejs/1.x/advanced-setup.html#es-modules`
    }
  },
  'python-only': {
    django: { url: `${DOCS_ROOT}/agent/python/2.x/django-support.html` },
    flask: { url: `${DOCS_ROOT}/agent/python/2.x/flask-support.html` }
  },
  'context-user': {
    nodejs: {
      text: featureContextUserText,
      url: `${DOCS_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-user-context`
    },
    python: {
      text: featureContextUserText,
      url: `${DOCS_ROOT}/agent/python/2.x/api.html#api-set-user-context`
    },
    ruby: {
      text: featureContextUserText,
      url: `${DOCS_ROOT}/agent/ruby/1.x/advanced.html#_providing_info_about_the_user`
    },
    javascript: {
      text: featureContextUserText,
      url: `${DOCS_ROOT}/agent/js-base/0.x/api.html#apm-set-user-context`
    }
  },
  'context-tags': {
    nodejs: {
      text: featureContextTagsText,
      url: `${DOCS_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-tag`
    },
    python: {
      text: featureContextTagsText,
      url: `${DOCS_ROOT}/agent/python/2.x/api.html#api-tag`
    },
    ruby: {
      text: featureContextTagsText,
      url: `${DOCS_ROOT}/agent/ruby/1.x/advanced.html#_adding_tags`
    },
    javascript: {
      text: `${DOCS_ROOT}/agent/js-base/0.x/api.html#apm-set-tags`
    }
  },
  'context-custom': {
    nodejs: {
      text: featureContextCustomText,
      url: `${DOCS_ROOT}/agent/nodejs/1.x/agent-api.html#apm-set-custom-context`
    },
    python: {
      text: featureContextCustomText,
      url: `${DOCS_ROOT}/agent/python/2.x/api.html#api-set-custom-context`
    },
    ruby: {
      text: featureContextCustomText,
      url: `${DOCS_ROOT}/agent/ruby/1.x/advanced.html#_adding_custom_context`
    },
    javascript: {
      text: featureContextCustomText,
      url: `${DOCS_ROOT}/agent/js-base/0.x/api.html#apm-set-custom-context`
    }
  },
  'dropped-spans': {
    nodejs: {
      url: `${DOCS_ROOT}/agent/nodejs/1.x/agent-api.html#transaction-max-spans`
    },
    python: {
      url: `${DOCS_ROOT}/agent/python/2.x/configuration.html#config-transaction-max-spans`
    }
  }
};

//
// Elastic docs
//
export const ELASTIC_DOCS = {
  'x-pack-emails': {
    url: `https://www.elastic.co/guide/en/x-pack/${STACK_VERSION}/actions-email.html#configuring-email`
  },
  'watcher-get-started': {
    url: `https://www.elastic.co/guide/en/x-pack/${STACK_VERSION}/watcher-getting-started.html`
  }
};

//
// Helper methods
//
function translateAgentName(agentName) {
  switch (agentName) {
    case 'js-react':
    case 'js-base':
      return 'javascript';

    default:
      return agentName;
  }
}

export function getFeatureDocs(featureName, agentName) {
  const translatedAgentName = translateAgentName(agentName);
  return get(APM_AGENT_DOCS, `${featureName}.${translatedAgentName}`);
}
