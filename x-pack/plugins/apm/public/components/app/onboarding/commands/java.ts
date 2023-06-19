/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { secretTokenHint, serverUrlHint, apiKeyHint } from './shared_hints';

export const javaVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'Delastic.apm.secret_token' }),
  ...(!secretToken && { apiKey: 'Delastic.apm.api_key' }),
  apmServerUrl: 'Delastic.apm.server_url',
});

export const javaHighlightLang = 'java';

export const javaLineNumbers = (apiKey?: string | null) => ({
  start: 1,
  highlight: '',
  annotations: {
    2: apiKey ? apiKeyHint : secretTokenHint,
    3: serverUrlHint,
  },
});
export const java = `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
{{^secretToken}}
-Delastic.apm.api_key={{{apiKey}}} \\
{{/secretToken}}
{{#secretToken}}
-Delastic.apm.secret_token={{{secretToken}}} \\
{{/secretToken}}
-Delastic.apm.server_url={{{apmServerUrl}}} \\
-Delastic.apm.application_packages=org.example \\
-jar my-service-name.jar`;
