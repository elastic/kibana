/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionRegistrationParameters } from '.';

export function registerLinkToFunction({ registerFunction }: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'link_to_apm_service_overview',
      contexts: ['core'],
      description: `Format service name as HTML link. The link will open the APM Service Overview page.

      \`\`\`
      [SERVICE_NAME](RELATIVE_PATH)
      \`\`\`
        
      The RELATIVE_PATH is \`/app/apm/services/SERVICE_NAME/overview?rangeFrom=START&rangeTo=END\`
      The SERVICE_NAME is the name of the service.`,
      descriptionForUser: 'Format service name as Markup.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch datemath',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch datemath',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async () => {
      return {
        content: {},
      };
    }
  );
  registerFunction(
    {
      name: 'link_to_hosts_details',
      contexts: ['core'],
      description: `Format host name as HTML link. The link will open the Host Details page.

      \`\`\`
      [HOST_NAME](RELATIVE_PATH)
      \`\`\`
        
      The RELATIVE_PATH is \`/app/metrics/detail/hosts/HOST_NAME/?assetDetails:(dateRange:(from:START,to=END))\`
      The HOST_NAME is the name of the host.`,
      descriptionForUser: 'Format host name as HTML link.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch datemath',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch datemath',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async () => {
      return {
        content: {},
      };
    }
  );
}
