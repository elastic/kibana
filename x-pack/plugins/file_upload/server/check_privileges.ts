/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { AuthorizationServiceSetup, CheckPrivilegesPayload } from '../../security/server';

interface Deps {
  request: KibanaRequest;
  authorization?: Pick<
    AuthorizationServiceSetup,
    'mode' | 'actions' | 'checkPrivilegesDynamicallyWithRequest'
  >;
  checkHasManagePipeline: boolean;
  checkCreateIndexPattern: boolean;
  indexName?: string;
}

export const checkFileUploadPrivileges = async ({
  request,
  authorization,
  checkHasManagePipeline,
  checkCreateIndexPattern,
  indexName,
}: Deps) => {
  const requiresAuthz = authorization?.mode.useRbacForRequest(request) ?? false;

  if (!authorization || !requiresAuthz) {
    return { hasImportPermission: true };
  }

  if (!request.auth.isAuthenticated) {
    return { hasImportPermission: false };
  }

  const checkPrivilegesPayload: CheckPrivilegesPayload = {
    elasticsearch: {
      cluster: checkHasManagePipeline ? ['manage_pipeline'] : [],
      index: indexName ? { [indexName]: ['create', 'create_index'] } : {},
    },
  };
  if (checkCreateIndexPattern) {
    checkPrivilegesPayload.kibana = [
      authorization.actions.savedObject.get('index-pattern', 'create'),
    ];
  }

  const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(request);
  const checkPrivilegesResp = await checkPrivileges(checkPrivilegesPayload);

  return { hasImportPermission: checkPrivilegesResp.hasAllRequested };
};
