/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_APP_URL_GENERATOR } from '../../../common/constants/ml_url_generator';
import { UrlGeneratorContract } from '../../../../../../src/plugins/share/public';

export const createMlUrlGeneratorMock = () =>
  ({
    id: ML_APP_URL_GENERATOR,
    isDeprecated: false,
    createUrl: jest.fn(),
    migrate: jest.fn(),
  } as jest.Mocked<UrlGeneratorContract<typeof ML_APP_URL_GENERATOR>>);
