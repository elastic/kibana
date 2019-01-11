/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPrivilege } from '../../../../../common/model/index_privilege';
import { Role } from '../../../../../common/model/role';

export function transformRoleForSave(role: Role) {
  // Remove any placeholder index privileges
  role.elasticsearch.indices = role.elasticsearch.indices.filter(
    indexPrivilege => !isPlaceholderPrivilege(indexPrivilege)
  );

  // Remove any placeholder query entries
  role.elasticsearch.indices.forEach(index => index.query || delete index.query);

  role.kibana.forEach(kibanaPrivilege => {
    // If a base privilege is defined, then do not persist feature privileges
    if (kibanaPrivilege.base.length > 0) {
      kibanaPrivilege.feature = {};
    }
  });
}

function isPlaceholderPrivilege(indexPrivilege: IndexPrivilege) {
  return indexPrivilege.names.length === 0;
}
