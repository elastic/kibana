/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { Capabilities } from 'x-pack/plugins/xpack_main/common';

export async function capabilityDecorator(
  server: Record<string, any>,
  request: Record<string, any>,
  capabilities: Capabilities
) {
  if (!isAuthenticatedRoute(request)) {
    return capabilities;
  }

  const { checkPrivilegesWithRequest, actions } = server.plugins.security.authorization;

  const checkPrivileges = checkPrivilegesWithRequest(request);

  const privilegedActions = getPrivilegedActions(server, actions);

  const { spaces } = server.plugins;

  let result;
  if (spaces) {
    result = await checkPrivileges.atSpace(spaces.getSpaceId(request), privilegedActions);
  } else {
    result = await checkPrivileges.globally(privilegedActions);
  }

  return {
    ...capabilities,
    ...result.privileges,
  };
}

function isAuthenticatedRoute(request: Record<string, any>) {
  const { settings } = request.route;
  return settings.auth !== false;
}

function getPrivilegedActions(server: Record<string, any>, actions: Record<string, any>) {
  const uiApps = server.getAllUiApps();

  const navLinkSpecs = server.getUiNavLinks();

  const uiCapabilityActions = [...uiApps, ...navLinkSpecs].map(entry => `ui:${entry._id}/read`);

  const { types } = server.savedObjects;

  const savedObjectsActions = _.flatten(
    types.map((type: string) => [
      actions.getSavedObjectAction(type, 'read'),
      actions.getSavedObjectAction(type, 'create'),
    ])
  );

  return [...uiCapabilityActions, ...savedObjectsActions];
}
