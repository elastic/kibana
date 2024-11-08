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
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { Entity } from '../../common/entities';
import { useKibana } from './use_kibana';
import { useInventoryParams } from './use_inventory_params';
import { useInventorySearchBarContext } from '../context/inventory_search_bar_context_provider';

const ACTIVE_COLUMNS = [ENTITY_DISPLAY_NAME, ENTITY_TYPE, ENTITY_LAST_SEEN];

export const useDiscoverRedirect = () => {
  const {
    services: { share, application, entityManager },
  } = useKibana();
  const {
    query: { kuery, entityTypes },
  } = useInventoryParams('/*');

  const { dataView } = useInventorySearchBarContext();

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(
    (entity?: Entity) => {
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
      dataView,
    ]
  );

  const getDiscoverRedirectUrl = useCallback(
    (entity?: Entity) => getDiscoverEntitiesRedirectUrl(entity),
    [getDiscoverEntitiesRedirectUrl]
  );

  return { getDiscoverRedirectUrl };
};
