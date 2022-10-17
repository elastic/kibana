/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { UnsecuredActionsClient } from './unsecured_actions_client';

type UnsecuredActionsClientContract = PublicMethodsOf<UnsecuredActionsClient>;
export type UnsecuredActionsClientMock = jest.Mocked<UnsecuredActionsClientContract>;

const createUnsecuredActionsClientMock = () => {
  const mocked: UnsecuredActionsClientMock = {
    bulkEnqueueExecution: jest.fn(),
  };
  return mocked;
};

export const unsecuredActionsClientMock: {
  create: () => UnsecuredActionsClientMock;
} = {
  create: createUnsecuredActionsClientMock,
};
