/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { License } from '../../services';
import { isEsError, wrapEsError } from '../../lib';

const license = new License();
license.getStatus = jest.fn().mockReturnValue({ isValid: true });

export const routeDependencies = {
  license,
  config: {
    isSecurityEnabled: jest.fn().mockReturnValue(true),
    isCloudEnabled: false,
    isSlmEnabled: true,
  },
  lib: {
    isEsError,
    wrapEsError,
  },
};
