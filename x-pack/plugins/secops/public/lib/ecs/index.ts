/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, has } from 'lodash/fp';

import { Ecs } from '../../graphql/types';

export { EcsSchema } from './ecs_schema';
export { EcsNamespace } from './ecs_namespace';
export { EcsField } from './ecs_field';

/**
 * Maps field names in the Elastic Common Schema (ECS) https://github.com/elastic/ecs
 * to properties of the runtime representation of the data, the `ECS` `interface`
 *
 * A map of `EcsField.name` `->` `ECS.name`
 */
export const mappedEcsSchemaFieldNames: Readonly<Record<string, string>> = {
  '@timestamp': 'timestamp',
};

export const getMappedFieldName = (fieldName: string) =>
  getOr(fieldName, fieldName, mappedEcsSchemaFieldNames); // defaults to the fieldName if there is no override

/**
 * Returns the value of the specified `EcsField` from the `ECS` instance
 * (if the value exists), or `undefined`.
 *
 * The implementation of this function uses the `virtualEcsSchema` and
 * `mappedEcsSchemaFieldNames` to handle "virtual" fields, (e.g. `id`),
 * and it handles "mapped" fields (e.g `@timestamp` to `timestamp`)
 */
export const getMappedEcsValue = ({
  data,
  fieldName,
}: {
  data: Ecs;
  fieldName: string;
}): string | undefined => {
  const path = getMappedFieldName(fieldName);
  if (has(path, data)) {
    return get(path, data);
  }
  return undefined;
};

export const fieldExists = ({ data, fieldName }: { data: Ecs; fieldName: string }): boolean =>
  getMappedEcsValue({ data, fieldName }) != null;
