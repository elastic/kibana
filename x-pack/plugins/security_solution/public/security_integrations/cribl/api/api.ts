/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { SECRUTIY_INTEGRATIONS_FLEET_MANAGED_INDEX_TEMPLATES_URL } from '../../../../common/constants';

export interface TemplateGetResponse {
  indexTemplates: string[];
  permissionsError?: boolean;
  generalError?: boolean;
}

export const getFleetManagedIndexTemplates = async (
  http: HttpSetup
): Promise<TemplateGetResponse> => {
  try {
    const indexTemplatesGetResponse = await http.get<string[]>(
      SECRUTIY_INTEGRATIONS_FLEET_MANAGED_INDEX_TEMPLATES_URL,
      {
        version: '1',
      }
    );

    return {
      indexTemplates: indexTemplatesGetResponse,
    };
  } catch (e) {
    if (e.response?.status === 403) {
      return {
        indexTemplates: [],
        permissionsError: true,
      };
    }
    return {
      indexTemplates: [],
      generalError: true,
    };
  }
};
