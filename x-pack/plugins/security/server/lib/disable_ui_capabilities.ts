/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, flatten, mapValues } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Actions } from './authorization';

interface FeatureAndCapability {
  featureId: string;
  uiCapability: string;
}

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
    const resultUICapabilities = cloneDeep(uiCapabilities);
    const featuresAndCapabilities = flatten(
      Object.entries(uiCapabilities).map(([featureId, key]) => {
        const capabilities = Object.keys(key);
        return capabilities.map(uiCapability => ({
          featureId,
          uiCapability,
        }));
      })
    );

    const map = new Map<string, FeatureAndCapability>(
      featuresAndCapabilities.map<[string, FeatureAndCapability]>(featureAndCapability => [
        actions.ui.get(featureAndCapability.featureId, featureAndCapability.uiCapability),
        featureAndCapability,
      ])
    );

    try {
      const checkPrivilegesResponse = await checkPrivilegesWhereYouCan(Array.from(map.keys()));

      for (const [uiAction, hasAction] of Object.entries(checkPrivilegesResponse.privileges)) {
        if (!hasAction) {
          const { featureId, uiCapability } = map.get(uiAction)!;
          resultUICapabilities[featureId][uiCapability] = false;
        }
      }

      return resultUICapabilities;
    } catch (err) {
      if (err.statusCode === 401 || err.statusCode === 403) {
        return mapValues(uiCapabilities, featureUICapabilities =>
          mapValues(featureUICapabilities, () => false)
        );
      }
      throw err;
    }
  };
}
