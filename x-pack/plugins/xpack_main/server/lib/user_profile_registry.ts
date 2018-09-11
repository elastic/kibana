/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const factories: any = {};

export function registerUserProfileCapabilityFactory(namespace: string, factory: () => any) {
  if (namespace in factories) {
    throw new Error(`Namespace ${namespace} is already registered`);
  }
  factories[namespace] = factory;
}

export async function buildUserProfile(server: any, request: any) {
  const factoryPromises = Object.keys(factories).map(async key => ({
    [key]: await factories[key](server, request),
  }));
  const factoryResults = await Promise.all(factoryPromises);

  return factoryResults.reduce((acc, capabilities) => {
    return {
      ...acc,
      ...capabilities,
    };
  }, {});
}
