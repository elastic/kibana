/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { useCallback } from 'react';
import type { Entity, EntityColumnIds } from '../../common/entities';
import { unflattenEntity } from '../../common/utils/unflatten_entity';
import { useKibana } from './use_kibana';
import { useUnifiedSearchContext } from './use_unified_search_context';

const ACTIVE_COLUMNS: EntityColumnIds[] = [ENTITY_DISPLAY_NAME, ENTITY_TYPE, ENTITY_LAST_SEEN];

export const useDiscoverRedirect = () => {
  const {
    services: { share, application, entityManager },
  } = useKibana();

  const { dataView, searchState } = useUnifiedSearchContext();

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(
    (entity?: Entity) => {
      const entityKqlFilter = entity
        ? entityManager.entityClient.asKqlFilter(unflattenEntity(entity))
        : '';

      const kueryWithEntityDefinitionFilters = [
        searchState.query.query,
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
            filters: [...searchState.filters, ...searchState.panelFilters],
          })
        : undefined;
    },
    [
      application.capabilities.discover?.show,
      dataView?.id,
      discoverLocator,
      entityManager.entityClient,
      searchState.filters,
      searchState.panelFilters,
      searchState.query.query,
    ]
  );

  const getDiscoverRedirectUrl = useCallback(
    (entity?: Entity) => getDiscoverEntitiesRedirectUrl(entity),
    [getDiscoverEntitiesRedirectUrl]
  );

  return { getDiscoverRedirectUrl };
};
