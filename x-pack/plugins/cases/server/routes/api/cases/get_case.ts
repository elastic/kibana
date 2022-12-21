/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { getWarningHeader, logDeprecatedEndpoint } from '../utils';
import { CASE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
  query: schema.object({
    /**
     * @deprecated since version 8.1.0
     */
    includeComments: schema.boolean({ defaultValue: true }),
  }),
};

export const getCaseRoute = createCasesRoute({
  method: 'get',
  path: CASE_DETAILS_URL,
  params,
  handler: async ({ context, request, response, logger, kibanaVersion }) => {
    try {
      const isIncludeCommentsParamProvidedByTheUser =
        request.url.searchParams.has('includeComments');

      if (isIncludeCommentsParamProvidedByTheUser) {
        logDeprecatedEndpoint(
          logger,
          request.headers,
          `The query parameter 'includeComments' of the get case API '${CASE_DETAILS_URL}' is deprecated`
        );
      }

      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const id = request.params.case_id;

      return response.ok({
        ...(isIncludeCommentsParamProvidedByTheUser && {
          headers: {
            ...getWarningHeader(kibanaVersion, 'Deprecated query parameter includeComments'),
          },
        }),
        body: await casesClient.cases.get({
          id,
          includeComments: request.query.includeComments,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case in route case id: ${request.params.case_id} \ninclude comments: ${request.query.includeComments}: ${error}`,
        error,
      });
    }
  },
});

export const resolveCaseRoute = createCasesRoute({
  method: 'get',
  path: `${CASE_DETAILS_URL}/resolve`,
  params,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const id = request.params.case_id;

      return response.ok({
        body: await casesClient.cases.resolve({
          id,
          includeComments: request.query.includeComments,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case in resolve route case id: ${request.params.case_id} \ninclude comments: ${request.query.includeComments}: ${error}`,
        error,
      });
    }
  },
});
