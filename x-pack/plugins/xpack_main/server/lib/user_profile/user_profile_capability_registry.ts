/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities } from 'x-pack/plugins/xpack_main/common';
import { PriorityCollection } from './priority_collection';

export type CapabilityDecorator = (
  server: Record<string, any>,
  request: Record<string, any>,
  capabilities: Capabilities
) => Promise<Capabilities>;

const decorators: PriorityCollection<CapabilityDecorator> = new PriorityCollection();

export function registerUserProfileCapabilityDecorator(
  priority: number,
  decorator: CapabilityDecorator
) {
  decorators.add(priority, decorator);
}

export async function buildUserCapabilities(
  server: Record<string, any>,
  request: Record<string, any>
): Promise<Capabilities> {
  const decoratedCapabilities = await executeDecorators(server, request, {});

  return decoratedCapabilities;
}

async function executeDecorators(
  server: Record<string, any>,
  request: Record<string, any>,
  capabilities: Capabilities
): Promise<Capabilities> {
  return await asyncForEach(decorators.toPrioritizedArray(), server, request, capabilities);
}

async function asyncForEach(
  array: CapabilityDecorator[],
  server: Record<string, any>,
  request: Record<string, any>,
  initialCapabilities: Capabilities
) {
  let capabilities = initialCapabilities;

  for (const callback of array) {
    capabilities = await callback(server, request, capabilities);
  }

  return capabilities;
}
