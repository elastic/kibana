/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type CapabilityFactory = (request: any) => Promise<{ [capability: string]: boolean }>;

let factories: CapabilityFactory[] = [];

export function removeAllFactories() {
  factories = [];
}

export function registerUserProfileCapabilityFactory(factory: CapabilityFactory) {
  factories.push(factory);
}

export async function buildUserProfile(request: any) {
  const factoryPromises = factories.map(async factory => ({
    ...(await factory(request)),
  }));

  const factoryResults = await Promise.all(factoryPromises);

  return factoryResults.reduce((acc, capabilities) => {
    return {
      ...acc,
      ...capabilities,
    };
  }, {});
}
