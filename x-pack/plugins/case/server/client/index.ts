/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { CaseClientImpl } from './client';

export { CaseClientImpl } from './client';
export { CaseClient } from './types';

// TODO: this screws up the mocking because it won't mock out CaseClientImpl's methods
/* export const createExternalCaseClient = (
  clientArgs: CaseClientFactoryArguments
): CaseClientPluginContract => {
  const client = new CaseClientImpl(clientArgs);
  return {
    create: async (args: CaseClientPostRequest) => client.create(args),
    addComment: async (args: CaseClientAddComment) => client.addComment(args),
    getFields: async (args: ConfigureFields) => client.getFields(args),
    getMappings: async (args: MappingsClient) => client.getMappings(args),
    update: async (args: CasesPatchRequest) => client.update(args),
    updateAlertsStatus: async (args: CaseClientUpdateAlertsStatus) =>
      client.updateAlertsStatus(args),
  };
};*/

export const createExternalCaseClient = (clientArgs: CaseClientFactoryArguments): CaseClient => {
  const client = new CaseClientImpl(clientArgs);
  return client;
};
