/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions' as const;
export const DEFAULT_URL_AZURE =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}' as const;

export const DEFAULT_BODY = `{
    "model":"gpt-3.5-turbo",
    "messages": [{
        "role":"user",
        "content":"Hello world"
    }]
}`;
export const DEFAULT_BODY_AZURE = `{
    "messages": [{
        "role":"user",
        "content":"Hello world"
    }]
}`;
