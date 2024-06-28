/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_PUT_CUSTOM_FIELDS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { customFieldsApiV1 } from '../../../../common/types/api';
import type { customFieldDomainV1 } from '../../../../common/types/domain';

export const replaceCustomFieldRoute = createCasesRoute({
  method: 'put',
  path: INTERNAL_PUT_CUSTOM_FIELDS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
      custom_field_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const customFieldId = request.params.custom_field_id;
      const details = request.body as customFieldsApiV1.CustomFieldPutRequest;

      const res: customFieldDomainV1.CaseCustomField = await casesClient.cases.replaceCustomField({
        caseId,
        customFieldId,
        request: details,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to replace customField in route: ${error}`,
        error,
      });
    }
  },
});
