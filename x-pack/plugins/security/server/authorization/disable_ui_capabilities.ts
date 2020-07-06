/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, isObject, mapValues } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { KibanaRequest, Logger } from '../../../../../src/core/server';
import { Feature } from '../../../features/server';

import { CheckPrivilegesResponse } from './check_privileges';
import { AuthorizationServiceSetup } from '.';

export function disableUICapabilitiesFactory(
  request: KibanaRequest,
  features: Feature[],
  logger: Logger,
  authz: AuthorizationServiceSetup
) {
  // nav links are sourced from two places:
  // 1) The `navLinkId` property. This is deprecated and will be removed (https://github.com/elastic/kibana/issues/66217)
  // 2) The apps property. The Kibana Platform associates nav links to the app which registers it, in a 1:1 relationship.
  //    This behavior is replacing the `navLinkId` property above.
  const featureNavLinkIds = features
    .flatMap((feature) => [feature.navLinkId, ...feature.app])
    .filter((navLinkId) => navLinkId != null);

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
      mapValues(featureUICapabilities, (value, uiCapability) => {
        if (typeof value === 'boolean') {
          if (shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
            return false;
          }
          return value;
        }

        if (isObject(value)) {
          return mapValues(value, () => false);
        }

        throw new Error(`Expected value type of boolean or object, but found ${value}`);
      })
    ) as UICapabilities;
  };

  const usingPrivileges = async (uiCapabilities: UICapabilities) => {
    function getActionsForFeatureCapability(
      featureId: string,
      uiCapability: string,
      value: boolean | Record<string, boolean>
    ): string[] {
      if (typeof value === 'boolean') {
        return [authz.actions.ui.get(featureId, uiCapability)];
      }
      if (isObject(value)) {
        return Object.keys(value).map((item) =>
          authz.actions.ui.get(featureId, uiCapability, item)
        );
      }
      throw new Error(`Expected value type of boolean or object, but found ${value}`);
    }

    const uiActions = Object.entries(uiCapabilities).reduce<string[]>(
      (acc, [featureId, featureUICapabilities]) => [
        ...acc,
        ...flatten(
          Object.entries(featureUICapabilities).map(([uiCapability, value]) => {
            return getActionsForFeatureCapability(featureId, uiCapability, value);
          })
        ),
      ],
      []
    );

    let checkPrivilegesResponse: CheckPrivilegesResponse;
    try {
      const checkPrivilegesDynamically = authz.checkPrivilegesDynamicallyWithRequest(request);
      checkPrivilegesResponse = await checkPrivilegesDynamically(uiActions);
    } catch (err) {
      // if we get a 401/403, then we want to disable all uiCapabilities, as this
      // is generally when the user hasn't authenticated yet and we're displaying the
      // login screen, which isn't driven any uiCapabilities
      if (err.statusCode === 401 || err.statusCode === 403) {
        logger.debug(
          `Disabling all uiCapabilities because we received a ${err.statusCode}: ${err.message}`
        );
        return disableAll(uiCapabilities);
      }
      throw err;
    }

    const checkPrivilegesForCapability = (
      enabled: boolean,
      featureId: string,
      ...uiCapabilityParts: string[]
    ) => {
      // if the uiCapability has already been disabled, we don't want to re-enable it
      if (!enabled) {
        return false;
      }

      const action = authz.actions.ui.get(featureId, ...uiCapabilityParts);
      return checkPrivilegesResponse.privileges.some(
        (x) => x.privilege === action && x.authorized === true
      );
    };

    return mapValues(uiCapabilities, (featureUICapabilities, featureId) => {
      return mapValues(
        featureUICapabilities,
        (value: boolean | Record<string, boolean>, uiCapability) => {
          if (typeof value === 'boolean') {
            if (!shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
              return value;
            }
            return checkPrivilegesForCapability(value, featureId!, uiCapability!);
          }

          if (isObject(value)) {
            const res = mapValues(value, (enabled, subUiCapability) => {
              return checkPrivilegesForCapability(
                enabled,
                featureId!,
                uiCapability!,
                subUiCapability!
              );
            });
            return res;
          }

          throw new Error(
            `Unexpected UI Capability value. Expected boolean or object, but found ${value}`
          );
        }
      );
    }) as UICapabilities;
  };

  return {
    all: disableAll,
    usingPrivileges,
  };
}
