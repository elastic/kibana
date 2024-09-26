/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateOfMap } from '@kbn/es-types/src/search';
import { Logger } from '@kbn/logging';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';
import { parse, render } from 'mustache';
import { EntityDefinition } from '../../../common/entities';
import {
  CompositeKeysOf,
  CompositePaginateCallback,
  CompositeSourceFieldMap,
  GroupsCompositeSubAggregationMap,
  compositePaginate,
} from './composite_paginate';

export async function compositePaginateThroughEntities<
  TCompositeSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
>(
  {
    definition,
    logger,
    aggs,
    getFieldAlias,
    fields,
  }: {
    definition: EntityDefinition;
    logger: Logger;
    aggs?: TAggregationMap;
    getFieldAlias?: (field: string) => string;
    fields: TCompositeSourceFieldMap;
  },
  callback: CompositePaginateCallback<
    CompositeSourceFieldMap & TCompositeSourceFieldMap,
    TAggregationMap
  >
): Promise<
  Array<{
    type: string;
    displayName: string;
    properties: Record<string, string | number | null>;
    doc_count: number;
    keys: CompositeKeysOf<TCompositeSourceFieldMap>;
    aggregations: AggregateOfMap<TAggregationMap, any>;
  }>
> {
  const { groups } = await compositePaginate<
    CompositeSourceFieldMap & TCompositeSourceFieldMap,
    TAggregationMap
  >(
    {
      logger,
      aggs,
      fields: {
        ...Object.fromEntries(
          definition.identityFields.map(({ field, optional }) => {
            return [field, { missing_bucket: optional, alias: getFieldAlias?.(field) }];
          })
        ),
        ...fields,
      },
    },
    callback
  );

  parse(definition.displayNameTemplate);

  const countsByEntity = groups.map((group) => {
    const type = definition.type;
    const { key, doc_count: docCount, ...rest } = group;

    const properties = Object.fromEntries(
      definition.identityFields.map(({ field }) => {
        const groupKey = group.key;

        return [field, groupKey[field]];
      })
    );

    const keys = Object.fromEntries(
      Object.entries(fields).map(([fieldName]) => {
        return [fieldName, group.key[fieldName]];
      })
    ) as CompositeKeysOf<TCompositeSourceFieldMap>;

    const displayName = render(definition.displayNameTemplate, unflattenObject(properties, {}));

    return {
      aggregations: rest as any,
      doc_count: docCount,
      type,
      properties,
      displayName,
      keys,
    };
  });

  return countsByEntity;
}
