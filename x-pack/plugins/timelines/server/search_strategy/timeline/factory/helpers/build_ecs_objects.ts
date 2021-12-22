/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, merge } from 'lodash/fp';
import { EventHit } from '../../../../../common/search_strategy';
import { ECS_METADATA_FIELDS, TIMELINE_EVENTS_FIELDS } from './constants';
import { Ecs } from '../../../../../common/ecs';
import { getTimestamp } from './get_timestamp';
import { buildObjectForFieldPath } from './build_object_for_field_path';
import { getNestedParentPath } from './get_nested_parent_path';

export const buildEcsObjects = (hit: EventHit): Ecs => {
  const ecsFields = [...TIMELINE_EVENTS_FIELDS];
  return ecsFields.reduce(
    (acc, field) => {
      const nestedParentPath = getNestedParentPath(field, hit.fields);
      if (
        nestedParentPath != null ||
        has(field, hit._source) ||
        has(field, hit.fields) ||
        ECS_METADATA_FIELDS.includes(field)
      ) {
        return merge(acc, buildObjectForFieldPath(field, hit));
      }
      return acc;
    },
    { _id: hit._id, timestamp: getTimestamp(hit), _index: hit._index }
  );
};
