/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AppSearchGatedFormDataApiLogicArguments {
  additionalFeedback: string | null;
  feature: string;
  featuresOther: string | null;
  participateInUXLabs: boolean | null;
}

export interface AppSearchGatedFormDataApiLogicResponse {
  created: string;
}

export const sendAppSearchGatedFormData = async ({
  feature,
  featuresOther,
  additionalFeedback,
  participateInUXLabs,
}: AppSearchGatedFormDataApiLogicArguments): Promise<AppSearchGatedFormDataApiLogicResponse> => {
  return await HttpLogic.values.http.post<AppSearchGatedFormDataApiLogicResponse>(
    '/internal/app_search/as_gate',
    {
      body: JSON.stringify({
        as_gate_data: {
          additional_feedback: additionalFeedback != null ? additionalFeedback : undefined,
          feature,
          features_other: featuresOther != null ? featuresOther : undefined,
          participate_in_ux_labs: participateInUXLabs != null ? participateInUXLabs : undefined,
        },
      }),
    }
  );
};

export type AppSearchGatedFormDataApiLogicActions = Actions<
  AppSearchGatedFormDataApiLogicArguments,
  AppSearchGatedFormDataApiLogicResponse
>;

export const UpdateAppSearchGatedFormDataApiLogic = createApiLogic(
  ['app_search', 'send_app_search_gatedForm_data_api_logic'],
  sendAppSearchGatedFormData
);
