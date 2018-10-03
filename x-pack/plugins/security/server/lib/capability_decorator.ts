/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

interface AnyObject {
  [key: string]: any;
}

// tslint:disable:no-default-export
export default async function capabilityDecorator(
  server: AnyObject,
  request: AnyObject,
  capabilities: { [key: string]: boolean }
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

function isAuthenticatedRoute(request: AnyObject) {
  const { settings } = request.route;
  return settings.auth !== false;
}

function getPrivilegedActions(server: AnyObject, actions: AnyObject) {
  const uiApps = server.getAllUiApps();

  const navLinkSpecs = server.getAllUiNavLinks();

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
