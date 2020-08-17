/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { propertyof, ValidationErrors } from './policies/policy_validation';

export const findFirstError = (errors?: ValidationErrors): string | undefined => {
  if (!errors) {
    return;
  }

  if (errors.policyName.length > 0) {
    return propertyof<ValidationErrors>('policyName');
  }

  if (Object.keys(errors.hot).length > 0) {
    return `${propertyof<ValidationErrors>('hot')}.${Object.keys(errors.hot)[0]}`;
  }
  if (Object.keys(errors.warm).length > 0) {
    return `${propertyof<ValidationErrors>('warm')}.${Object.keys(errors.warm)[0]}`;
  }
  if (Object.keys(errors.cold).length > 0) {
    return `${propertyof<ValidationErrors>('cold')}.${Object.keys(errors.cold)[0]}`;
  }
  if (Object.keys(errors.delete).length > 0) {
    return `${propertyof<ValidationErrors>('delete')}.${Object.keys(errors.delete)[0]}`;
  }
};
