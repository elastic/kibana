/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Actions } from './authorization';

export function disableUICapabilitesFactory(server: any, request: any) {
  const { spaces } = server.plugins;
  const { authorization } = server.plugins.security;
  const actions: Actions = authorization.actions;

  const checkPrivilegesWhereYouCan = async (checkActions: string[]) => {
    const checkPrivileges: any = authorization.checkPrivilegesWithRequest(request);
    if (spaces) {
      const spaceId = spaces.getSpaceId(request);
      return await checkPrivileges.atSpace(spaceId, checkActions);
    } else {
      return await checkPrivileges.globally(checkActions);
    }
  };

  return async function disableUICapabilities(uiCapabilities: UICapabilities) {
    const uiActions = Object.entries(uiCapabilities).reduce<string[]>(
      (acc, [featureId, featureUICapabilities]) => [
        ...acc,
        ...Object.keys(featureUICapabilities).map(uiCapability =>
          actions.ui.get(featureId, uiCapability)
        ),
      ],
      []
    );

    let checkPrivilegesResponse: any;
    try {
      checkPrivilegesResponse = await checkPrivilegesWhereYouCan(uiActions);
    } catch (err) {
      // if we get a 401/403, then we want to disable all uiCapabilities, as this
      // is generally when the user hasn't authenticated yet and we're displaying the
      // login screen, which isn't driven any uiCapabilities
      if (err.statusCode === 401 || err.statusCode === 403) {
        return mapValues(uiCapabilities, featureUICapabilities =>
          mapValues(featureUICapabilities, () => false)
        );
      }
      throw err;
    }

    return mapValues(uiCapabilities, (featureUICapabilities, featureId) => {
      return mapValues(featureUICapabilities, (enabled, uiCapability) => {
        // if the uiCapability has already been disabled, we don't want to re-enable it
        if (!enabled) {
          return false;
        }

        const action = actions.ui.get(featureId!, uiCapability!);
        return checkPrivilegesResponse.privileges[action];
      });
    });
  };
}
