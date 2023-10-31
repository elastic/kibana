/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchApplication } from '../../../../../common/types/search_applications';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface UpdateSearchApplicationApiParams {
  indices: string[];
  name: string;
  template: {
    script: {
      lang: string;
      options: object;
      params: object;
      source: string;
    };
  };
}

export type UpdateSearchApplicationApiResponse = EnterpriseSearchApplication;

export type UpdateSearchApplicationApiLogicActions = Actions<
  UpdateSearchApplicationApiParams,
  UpdateSearchApplicationApiResponse
>;

export const updateSearchApplication = async ({
  name,
  indices,
  template,
}: UpdateSearchApplicationApiParams): Promise<UpdateSearchApplicationApiResponse> => {
  const route = `/internal/enterprise_search/search_applications/${name}`;

  return await HttpLogic.values.http.put<EnterpriseSearchApplication>(route, {
    body: JSON.stringify({ indices, name, template }),
  });
};

export const UpdateSearchApplicationApiLogic = createApiLogic(
  ['searchApplications', 'update_search_application_api_logic'],
  updateSearchApplication
);
