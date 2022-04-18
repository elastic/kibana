/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

export const getUpdatableSavedObjectTypes = async ({
  request,
  types,
  authorization,
}: {
  types: string[];
  request: KibanaRequest;
  authorization?: SecurityPluginSetup['authz'];
}) => {
  // Don't bother authorizing if the security plugin is disabled, or if security is disabled in ES
  const shouldAuthorize = authorization?.mode.useRbacForRequest(request) ?? false;
  if (!shouldAuthorize) {
    return types;
  }

  // Each Saved Object type has a distinct privilege/action that we need to check
  const typeActionMap = types.reduce((acc, type) => {
    return {
      ...acc,
      [type]: authorization!.actions.savedObject.get(type, 'update'),
    };
  }, {} as Record<string, string>);

  // Perform the privilege check
  const checkPrivileges = authorization!.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges } = await checkPrivileges({ kibana: Object.values(typeActionMap) });

  // Filter results to only include the types that passed the authorization check above.
  return types.filter((type) => {
    const requiredPrivilege = typeActionMap[type];

    const hasRequiredPrivilege = privileges.kibana.some(
      (kibanaPrivilege) =>
        kibanaPrivilege.privilege === requiredPrivilege && kibanaPrivilege.authorized === true
    );

    return hasRequiredPrivilege;
  });
};
