/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { schema } from '@kbn/config-schema';
import { IRouter, SavedObject, SavedObjectsType } from 'src/core/server';
import { tagSavedObjectTypeName, taggableTypes } from '../../../common/constants';
import { AssignableObject } from '../../../common/types';

export const registerFindAssignableObjectsRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/saved_objects_tagging/assignments/_find_assignable_objects',
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string()),
          max_results: schema.number({ min: 0, defaultValue: 1000 }),
          types: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { query } = req;
      const { client, typeRegistry } = ctx.core.savedObjects;
      const requestedTypes = typeof query.types === 'string' ? [query.types] : query.types;

      const types = requestedTypes ?? taggableTypes;

      // TODO: filter based on user permissions

      const searchFields = uniq(
        types.map((name) => typeRegistry.getType(name)?.management!.defaultSearchField!)
      );

      const findResponse = await client.find({
        page: 1,
        perPage: query.max_results,
        search: query.search,
        type: types,
        searchFields,
      });

      const objects = findResponse.saved_objects.map((object) =>
        toAssignableObject(object, typeRegistry.getType(object.type)!)
      );
      // const allTypes = typeRegistry.getAllTypes().map((type) => type.name);

      return res.ok({
        body: {
          objects,
          total: findResponse.total,
        },
      });
    })
  );
};

const toAssignableObject = (object: SavedObject, typeDef: SavedObjectsType): AssignableObject => {
  return {
    id: object.id,
    type: object.type,
    title: typeDef.management?.getTitle ? typeDef.management.getTitle(object) : object.id,
    icon: typeDef.management?.icon,
    tags: object.references
      .filter(({ type }) => type === tagSavedObjectTypeName)
      .map(({ id }) => id),
  };
};
