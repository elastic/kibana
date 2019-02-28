/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, has, keyBy, sortBy } from 'lodash/fp';

import { Ecs } from '../../graphql/types';
import { EcsField } from './ecs_field';
import { EcsSchema } from './ecs_schema';

export { EcsSchema } from './ecs_schema';
export { EcsNamespace } from './ecs_namespace';
export { EcsField } from './ecs_field';
export { rawEcsSchema } from './raw_ecs_schema';
export { virtualEcsSchema } from './virtual_ecs_schema';

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

/**
 * Returns an `EcsField[]` containing all fields in the `EcsSchema`
 */
export const getAllFieldsInSchema = (schema: EcsSchema): EcsField[] =>
  Object.values(schema).reduce<EcsField[]>(
    (acc, namespace) => [...acc, ...Object.values(namespace.fields)],
    []
  );

export const useMappedFieldName = (field: EcsField): EcsField =>
  has(field.name, mappedEcsSchemaFieldNames)
    ? { ...field, name: mappedEcsSchemaFieldNames[field.name] }
    : field;

/**
 * Returns an `fieldName -> EcsField` map containing all fields in the `EcsSchema`
 */
export const getAllFieldsInSchemaByMappedName = (
  schema: EcsSchema
): { [fieldName: string]: EcsField } =>
  keyBy('name', getAllFieldsInSchema(schema).map(useMappedFieldName));

/**
 * Returns an `EcsField[]`, ordered by `EcsField.name`, that is
 * populated with all the fields from the `schema` that exist in `data`,
 * the runtime representation of an event. This function uses
 * `mappedEcsSchemaFieldNames` to adapt from `EcsSchema.name` to `ECS.name`
 */
export const getPopulatedMappedFields = ({
  data,
  schema,
}: {
  data: Ecs;
  schema: EcsSchema;
}): EcsField[] =>
  sortBy(
    'name',
    getAllFieldsInSchema(schema).filter(f => getMappedEcsValue({ data, fieldName: f.name }) != null)
  );

export const fieldExists = ({ data, fieldName }: { data: Ecs; fieldName: string }): boolean =>
  getMappedEcsValue({ data, fieldName }) != null;
