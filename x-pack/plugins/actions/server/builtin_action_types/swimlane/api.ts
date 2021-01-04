/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRecordApiHandlerArgs, CreateRecordResponse, ExternalServiceApi } from './types';

const createRecordHandler = async ({
  externalService,
  params,
}: CreateRecordApiHandlerArgs): Promise<CreateRecordResponse> => {
  return await externalService.createRecord(params);
};

export const api: ExternalServiceApi = {
  createRecord: createRecordHandler,
};
