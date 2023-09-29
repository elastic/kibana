/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GatedFormDataApiLogicArguments {
  additionalFeedback?: string;
  feature: string;
  featuresOther?: string;
  participateInUXLabs?: boolean;
}
export interface GatedFormDataApiLogicResponse {
  created: string;
}

export const sendGatedFormData = async ({
  feature,
  featuresOther,
  additionalFeedback,
  participateInUXLabs,
}: GatedFormDataApiLogicArguments) => {
  console.log('feature', feature);

  return await HttpLogic.values.http.post<GatedFormDataApiLogicResponse>(
    '/internal/workplace_search/ws_gate',
    {
      body: JSON.stringify({
        ws_gate_data: {
          feature,
          featuresOther,
          additionalFeedback,
          participateInUXLabs,
        },
      }),
    }
  );
  // console.log('response', response);
};

export type GatedFormDataApiLogicActions = Actions<
  GatedFormDataApiLogicArguments,
  GatedFormDataApiLogicResponse
>;

export const UpdateGatedFormDataApiLogic = createApiLogic(
  ['send_gatedForm_data_api_logic'],
  sendGatedFormData
);
