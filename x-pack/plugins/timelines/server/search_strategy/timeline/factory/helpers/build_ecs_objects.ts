/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { has, merge } from 'lodash/fp';
import { EventHit } from '../../../../../common/search_strategy';
import { buildObjectRecursive } from './build_object_recursive';
import { ECS_METADATA_FIELDS, TIMELINE_EVENTS_FIELDS } from './constants';
import { getNestedParentPath } from './get_nested_parent_path';
import { getTimestamp } from './get_timestamp';

export const buildEcsObjects = (hit: EventHit): Ecs => {
  const ecsFields = [...TIMELINE_EVENTS_FIELDS];
  return ecsFields.reduce(
    (acc, field) => {
      const nestedParentPath = getNestedParentPath(field, hit.fields);
      if (
        nestedParentPath != null ||
        has(field, hit.fields) ||
        ECS_METADATA_FIELDS.includes(field)
      ) {
        return merge(acc, buildObjectRecursive(field, hit.fields));
      }
      return acc;
    },
    { _id: hit._id, timestamp: getTimestamp(hit), _index: hit._index }
  );
};
