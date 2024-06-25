/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseSuccess } from '@kbn/zod-helpers';
import { BuildIntegrationRequestBody } from './build_integration';
import { getBuildIntegrationRequestMock } from '../model/api_test.mock';

describe('Build Integration request schema', () => {
  test('full request validate', () => {
    const payload: BuildIntegrationRequestBody = getBuildIntegrationRequestMock();

    const result = BuildIntegrationRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });
});
