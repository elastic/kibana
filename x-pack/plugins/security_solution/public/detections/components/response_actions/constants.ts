/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RESPONSE_ACTION_TYPES {
  OSQUERY = '.osquery',
}

export const getLogo = (actionTypeId: string) => {
  switch (actionTypeId) {
    case 'osquery':
      return 'logoOsquery';
    // update when new responseActions are provided
    default:
      return 'logoOsquery';
  }
};
