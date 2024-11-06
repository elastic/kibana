/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { capitalize, sortBy } from 'lodash';

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InternalRouteDeps } from '.';
import { wrapError } from '../../../lib/errors';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

interface SpaceContentTypeMetaInfo {
  displayName: string;
  icon?: string;
}

interface TypesAggregation {
  typesAggregation: {
    buckets: Array<{ doc_count: number; key: string }>;
  };
}

type SpaceContentTypesMetaData = Record<string, SpaceContentTypeMetaInfo>;

export interface SpaceContentTypeSummaryItem extends SpaceContentTypeMetaInfo {
  count: number;
  type: string;
}

export function initGetSpaceContentSummaryApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.get(
    {
      path: '/internal/spaces/{spaceId}/content_summary',
      security: {
        authz: {
          requiredPrivileges: ['manage_spaces'],
        },
      },
      validate: {
        params: schema.object({
          spaceId: schema.string({
            validate: (value) => {
              if (!SPACE_ID_REGEX.test(value)) {
                return `lower case, a-z, 0-9, "_", and "-" are allowed.`;
              }
            },
            minLength: 1,
          }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const spaceId = request.params.spaceId;
        const spacesClient = getSpacesService().createSpacesClient(request);

        await spacesClient.get(spaceId);

        const { getClient, typeRegistry } = (await context.core).savedObjects;
        const client = getClient();

        const types = typeRegistry
          .getImportableAndExportableTypes()
          .filter((type) => !typeRegistry.isNamespaceAgnostic(type.name));

        const searchTypeNames = types.map((type) => type.name);

        const data = await client.find<unknown, TypesAggregation>({
          type: searchTypeNames,
          perPage: 0,
          namespaces: [spaceId],
          aggs: {
            typesAggregation: {
              terms: {
                field: 'type',
                size: types.length,
              },
            },
          },
        });

        const typesMetaInfo = types.reduce<SpaceContentTypesMetaData>((acc, currentType) => {
          acc[currentType.name] = {
            displayName: currentType.management?.displayName ?? capitalize(currentType.name),
            icon: currentType.management?.icon,
          };

          return acc;
        }, {});

        const summary = sortBy(
          data.aggregations?.typesAggregation.buckets.map<SpaceContentTypeSummaryItem>((item) => ({
            count: item.doc_count,
            type: item.key,
            ...typesMetaInfo[item.key],
          })),
          (item) => item.displayName.toLowerCase()
        );

        return response.ok({ body: { summary, total: data.total } });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return response.notFound();
        }

        return response.customError(wrapError(error));
      }
    })
  );
}
