/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { clone } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';
import { CheckPrivilegesAtResourceResponse } from './check_privileges';
import { CheckPrivilegesDynamically } from './check_privileges_dynamically';
import { uiCapabilitiesGroupsFactory } from './ui_capabilities_groups';

export function disableUICapabilitesFactory(
  server: Record<string, any>,
  request: Record<string, any>
) {
  const {
    security: { authorization },
    xpack_main: xpackMainPlugin,
  } = server.plugins;

  const features: Feature[] = xpackMainPlugin.getFeatures();
  const actions: Actions = authorization.actions;
  const uiCapabilitiesGroups = uiCapabilitiesGroupsFactory(actions, features);

  const disableAll = (uiCapabilities: UICapabilities) => {
    const mutableUICapabilities = clone(uiCapabilities, true);
    for (const group of uiCapabilitiesGroups) {
      group.disable(mutableUICapabilities);
    }
    return mutableUICapabilities;
  };

  const usingPrivileges = async (uiCapabilities: UICapabilities) => {
    const uiActions: string[] = uiCapabilitiesGroups.reduce(
      (acc, group) => [...acc, ...group.getActions(uiCapabilities)],
      [] as string[]
    );

    let checkPrivilegesResponse: CheckPrivilegesAtResourceResponse;
    try {
      const checkPrivilegesDynamically: CheckPrivilegesDynamically = authorization.checkPrivilegesDynamicallyWithRequest(
        request
      );
      checkPrivilegesResponse = await checkPrivilegesDynamically(uiActions);
    } catch (err) {
      // if we get a 401/403, then we want to disable all uiCapabilities, as this
      // is generally when the user hasn't authenticated yet and we're displaying the
      // login screen, which isn't driven any uiCapabilities
      if (err.statusCode === 401 || err.statusCode === 403) {
        server.log(
          ['security', 'debug'],
          `Disabling all uiCapabilities because we received a ${err.statusCode}: ${err.message}`
        );
        return disableAll(uiCapabilities);
      }
      throw err;
    }

    const mutableUICapabilities = clone(uiCapabilities, true);
    for (const group of uiCapabilitiesGroups) {
      group.disableUsingPrivileges(mutableUICapabilities, checkPrivilegesResponse);
    }
    return mutableUICapabilities;
  };

  return {
    all: disableAll,
    usingPrivileges,
  };
}
