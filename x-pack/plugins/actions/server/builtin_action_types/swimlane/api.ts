/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CreateRecordApiHandlerArgs,
  CreateRecordResponse,
  ExternalServiceApi,
  GetApplicationHandlerArgs,
} from './types';

const getApplicationHandler = async ({ externalService }: GetApplicationHandlerArgs) => {
  return await externalService.application();
};

const createRecordHandler = async ({
  externalService,
  params,
}: CreateRecordApiHandlerArgs): Promise<CreateRecordResponse> => {
  return await externalService.createRecord(params);
};

export const api: ExternalServiceApi = {
  application: getApplicationHandler,
  createRecord: createRecordHandler,
};
