/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ENTITY_TYPE,
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
} from '@kbn/observability-shared-plugin/common';
import { useCallback } from 'react';
import { type PhrasesFilter, buildPhrasesFilter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { Entity, EntityColumnIds } from '../../common/entities';
import { unflattenEntity } from '../../common/utils/unflatten_entity';
import { useKibana } from './use_kibana';
import { useInventoryParams } from './use_inventory_params';

const ACTIVE_COLUMNS: EntityColumnIds[] = [ENTITY_DISPLAY_NAME, ENTITY_TYPE, ENTITY_LAST_SEEN];

export const useDiscoverRedirect = () => {
  const {
    services: { share, application, entityManager },
  } = useKibana();
  const {
    query: { kuery, entityTypes },
  } = useInventoryParams('/*');

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(
    ({ entity, dataView }: { entity?: Entity; dataView?: DataView }) => {
      const filters: PhrasesFilter[] = [];

      const entityTypeField = (dataView?.getFieldByName(ENTITY_TYPE) ??
        entity?.[ENTITY_TYPE]) as DataViewField;

      if (entityTypes && entityTypeField && dataView) {
        const entityTypeFilter = buildPhrasesFilter(entityTypeField, entityTypes, dataView);
        filters.push(entityTypeFilter);
      }

      const entityKqlFilter = entity
        ? entityManager.entityClient.asKqlFilter(unflattenEntity(entity))
        : '';

      const kueryWithEntityDefinitionFilters = [
        kuery,
        entityKqlFilter,
        `${ENTITY_DEFINITION_ID} : builtin*`,
      ]
        .filter(Boolean)
        .join(' AND ');

      return application.capabilities.discover?.show
        ? discoverLocator?.getRedirectUrl({
            indexPatternId: dataView?.id ?? '',
            columns: ACTIVE_COLUMNS,
            query: { query: kueryWithEntityDefinitionFilters, language: 'kuery' },
            filters,
          })
        : undefined;
    },
    [
      application.capabilities.discover?.show,
      discoverLocator,
      entityManager.entityClient,
      entityTypes,
      kuery,
    ]
  );

  const getDiscoverRedirectUrl = useCallback(
    ({ entity, dataView }: { entity?: Entity; dataView?: DataView }) =>
      getDiscoverEntitiesRedirectUrl({ entity, dataView }),
    [getDiscoverEntitiesRedirectUrl]
  );

  return { getDiscoverRedirectUrl };
};
