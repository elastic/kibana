/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role, RoleIndexPrivilege } from '../../common/model';
import { isGlobalPrivilegeDefinition } from './privilege_utils';

export function transformRoleForSave(role: Role, spacesEnabled: boolean) {
  // Remove any placeholder index privileges
  role.elasticsearch.indices = role.elasticsearch.indices.filter(
    indexPrivilege => !isPlaceholderPrivilege(indexPrivilege)
  );

  // Remove any placeholder query entries
  role.elasticsearch.indices.forEach(index => index.query || delete index.query);

  // If spaces are disabled, then do not persist any space privileges
  if (!spacesEnabled) {
    role.kibana = role.kibana.filter(isGlobalPrivilegeDefinition);
  }

  role.kibana.forEach(kibanaPrivilege => {
    // If a base privilege is defined, then do not persist feature privileges
    if (kibanaPrivilege.base.length > 0) {
      kibanaPrivilege.feature = {};
    }
  });

  delete role.name;
  delete role.transient_metadata;
  delete role._unrecognized_applications;
  delete role._transform_error;

  return role;
}

function isPlaceholderPrivilege(indexPrivilege: RoleIndexPrivilege) {
  return indexPrivilege.names.length === 0;
}
