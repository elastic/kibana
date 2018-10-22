/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivilege } from '../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from './constants';

export function getAvailablePrivileges(minimumPrivilege: KibanaPrivilege): KibanaPrivilege[] {
  switch (minimumPrivilege) {
    case NO_PRIVILEGE_VALUE:
      return ['read', 'all'];
    case 'read':
      return ['read', 'all'];
    case 'all':
      return ['all'];
    default:
      throw new Error(`Unexpected minimumPrivilege value: ${minimumPrivilege}`);
  }
}
