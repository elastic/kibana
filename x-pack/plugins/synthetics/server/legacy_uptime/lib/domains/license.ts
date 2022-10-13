/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/server';

export interface UMLicenseStatusResponse {
  statusCode: number;
  message: string;
}
export type UMLicenseCheck = (
  license?: Pick<ILicense, 'isActive' | 'hasAtLeast'>
) => UMLicenseStatusResponse;

export const licenseCheck: UMLicenseCheck = (license) => {
  if (license === undefined) {
    return {
      message: 'Missing license information',
      statusCode: 400,
    };
  }
  if (!license.hasAtLeast('basic')) {
    return {
      message: 'License not supported',
      statusCode: 401,
    };
  }
  if (license.isActive === false) {
    return {
      message: 'License not active',
      statusCode: 403,
    };
  }
  return {
    message: 'License is valid and active',
    statusCode: 200,
  };
};
