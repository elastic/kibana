/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../../../graphql/types';

/**
 * Returns true if the ECS object represents a process event with an entity_id.
 * This is the minimum data required to call resolver APIs.
 *
 * If you query the resolver APIs, they could still fail depending on what
 * other data is available.
 *
 * If you use this to determine whether to show Resolver,
 * you still need to handle the case where Resolver
 * fails to load.
 */
export function canBeUsedToQueryResolverAPIs(ecs: Ecs): boolean {
  // TODO, should this handle legacy events?
  // TODO, is 'category' guaranteed to be an array?
  // TODO, is 'ecs.event.kind' guaranteed to be an array? it is not an array according to ECS: https://github.com/elastic/ecs/blob/6ca4da1d5c75c217f134a5c39cc9be281d2f1953/schemas/event.yml#L41
  // Does the `Ecs` type represent a raw ECS document? Or is it somehow specific to our graphql implementation?
  // TODO, should we use some runtime type system for this? We can't rely on ECS since users can modify the data. right? Or has this data already been coerced?
  return Boolean(
    ecs.event?.category?.includes('process') &&
      ecs.event?.kind?.includes('event') &&
      (ecs.process ? 'entity_id' in ecs.process : false)
  );
}
