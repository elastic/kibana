/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttributeGroupingSource,
  ServiceGroupingStrategy,
  ServiceMapGroup,
} from '@kbn/apm-types';
import { NO_ATTRIBUTE_GROUP_ID } from './constants';

/**
 * A group for every service, by the value of one attribute. Services sharing a value share a
 * group, whatever their calls, and services with no value, or an empty one, share one group.
 * Unlike grouping by calls, there are no shared or not connected groups: the user asked for the
 * attribute, so a service called by everyone still sits with its value.
 *
 * `assignment[i]` is the index in `groups` of `services[i]`, and groups are listed in the order
 * their first service appears. Whether the grouping reads well, `passes`, is for the caller to add.
 */
export function groupServicesByAttribute({
  source,
  services,
  valueOfService,
}: {
  source: AttributeGroupingSource;
  services: readonly string[];
  valueOfService: (service: string) => string | undefined;
}): Omit<ServiceGroupingStrategy, 'passes'> {
  const groups: ServiceMapGroup[] = [];
  const indexById = new Map<string, number>();

  const assignment = services.map((service) => {
    const value = valueOfService(service);
    const group: ServiceMapGroup = value
      ? { id: `${source}:${value}`, kind: 'attribute', attribute: source, value }
      : { id: NO_ATTRIBUTE_GROUP_ID, kind: 'noAttribute', attribute: source };
    const known = indexById.get(group.id);
    if (known !== undefined) {
      return known;
    }
    indexById.set(group.id, groups.length);
    groups.push(group);
    return groups.length - 1;
  });

  return { source, groups, assignment };
}
