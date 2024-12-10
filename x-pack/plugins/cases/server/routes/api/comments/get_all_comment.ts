/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { DocLinksServiceSetup } from '@kbn/core/server';
import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { attachmentDomainV1 } from '../../../../common/types/domain';

/**
 * @deprecated since version 8.1.0
 */
export const getAllCommentsRoute = ({
  isServerless,
  docLinks,
}: {
  isServerless?: boolean;
  docLinks: DocLinksServiceSetup;
}) =>
  createCasesRoute({
    method: 'get',
    path: CASE_COMMENTS_URL,
    params: {
      params: schema.object({
        case_id: schema.string(),
      }),
    },
    options: {
      deprecated: true,
    },
    routerOptions: {
      access: isServerless ? 'internal' : 'public',
      summary: `Gets all case comments`,
      tags: ['oas-tag:cases'],
      // description: 'You must have `read` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you\'re seeking.',
      deprecated: {
        documentationUrl: docLinks.links.cases.legacyApiDeprecations,
        severity: 'warning',
        reason: {
          type: 'migrate',
          newApiMethod: 'GET',
          newApiPath: '/api/cases/{case_id}/comments/_find',
        },
      },
    },
    handler: async ({ context, request, response }) => {
      try {
        const caseContext = await context.cases;
        const client = await caseContext.getCasesClient();
        const res: attachmentDomainV1.Attachments = await client.attachments.getAll({
          caseID: request.params.case_id,
        });

        return response.ok({
          body: res,
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to get all comments in route case id: ${request.params.case_id}: ${error}`,
          error,
        });
      }
    },
  });
