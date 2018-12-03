/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';
import { CheckPrivilegesAtResourceResponse } from './check_privileges';
import { CheckPrivilegesDynamically } from './check_privileges_dynamically';

export function disableUICapabilitesFactory(
  server: Record<string, any>,
  request: Record<string, any>
) {
  const {
    security: { authorization },
    xpack_main: xpackMainPlugin,
  } = server.plugins;

  const features: Feature[] = xpackMainPlugin.getFeatures();
  const featureNavLinkIds = features
    .map(feature => feature.navLinkId)
    .filter(navLinkId => navLinkId != null);

  const actions: Actions = authorization.actions;
  const shouldDisableFeatureUICapability = (
    featureId: keyof UICapabilities,
    uiCapability: string
  ) => {
    // if the navLink isn't for a feature that we have registered, we don't wish to
    // disable it based on privileges
    return featureId !== 'navLinks' || featureNavLinkIds.includes(uiCapability);
  };

  const disableAll = (uiCapabilities: UICapabilities) => {
    return mapValues(uiCapabilities, (featureUICapabilities, featureId) =>
      mapValues(featureUICapabilities, (enabled, uiCapability) => {
        if (shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
          return false;
        }

        return enabled;
      })
    );
  };

  const usingPrivileges = async (uiCapabilities: UICapabilities) => {
    const uiActions = Object.entries(uiCapabilities).reduce<string[]>(
      (acc, [featureId, featureUICapabilities]) => [
        ...acc,
        ...Object.keys(featureUICapabilities).map(uiCapability =>
          actions.ui.get(featureId, uiCapability)
        ),
      ],
      []
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

    return mapValues(uiCapabilities, (featureUICapabilities, featureId) => {
      return mapValues(featureUICapabilities, (enabled, uiCapability) => {
        if (!shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
          return enabled;
        }

        // if the uiCapability has already been disabled, we don't want to re-enable it
        if (!enabled) {
          return false;
        }

        const action = actions.ui.get(featureId!, uiCapability!);
        return checkPrivilegesResponse.privileges[action] === true;
      });
    });
  };

  return {
    all: disableAll,
    usingPrivileges,
  };
}
