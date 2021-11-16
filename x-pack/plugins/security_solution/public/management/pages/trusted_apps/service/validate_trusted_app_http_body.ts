/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NewTrustedApp,
  OperatingSystem,
  UpdateTrustedApp,
} from '../../../../../common/endpoint/types';
import { HttpRequestValidationError } from './errors';

const VALID_OS_LIST: readonly OperatingSystem[] = Object.freeze([
  OperatingSystem.LINUX,
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
]);

/**
 * Validates that the Trusted App is valid for sending to the API for a create (`POST`)
 *
 * @throws
 */
export const validateTrustedAppHttpPostBody = async (trustedApp: NewTrustedApp): Promise<true> => {
  const failedValidations: string[] = [];

  if (!VALID_OS_LIST.includes(trustedApp.os)) {
    failedValidations.push(`Unknown OS [${trustedApp.os}]`);
  }

  // FIXME: implement additional validations once discussion around adding List plugin validation is addressed (#2205)

  if (failedValidations.length) {
    throw new HttpRequestValidationError<string[]>(
      'Invalid trusted application',
      failedValidations
    );
  }

  return true;
};

/**
 * Validates that the Trusted App is valid for sending to the API for a update (`PUT`)
 *
 * @throws
 */
export const validateTrustedAppHttpPutBody = async (
  trustedApp: UpdateTrustedApp
): Promise<true> => {
  await validateTrustedAppHttpPostBody(trustedApp);

  if (!trustedApp.version) {
    throw new HttpRequestValidationError('missing "version" property');
  }

  return true;
};
