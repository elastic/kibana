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
import type { InventoryEntity } from '../../common/entities';
import { useKibana } from './use_kibana';
import { useUnifiedSearchContext } from './use_unified_search_context';

const ACTIVE_COLUMNS = [ENTITY_DISPLAY_NAME, ENTITY_TYPE, ENTITY_LAST_SEEN];

export const useDiscoverRedirect = () => {
  const {
    services: { share, application, entityManager },
  } = useKibana();

  const {
    dataView,
    searchState: { query, filters, panelFilters },
  } = useUnifiedSearchContext();

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(
    (entity?: InventoryEntity) => {
      const entityKqlFilter = entity
        ? entityManager.entityClient.asKqlFilter({
            entity: {
              identity_fields: entity.entityIdentityFields,
            },
            ...entity,
          })
        : '';

      const kueryWithEntityDefinitionFilters = [
        query.query,
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
            filters: [...filters, ...panelFilters],
          })
        : undefined;
    },
    [
      application.capabilities.discover?.show,
      dataView?.id,
      discoverLocator,
      entityManager.entityClient,
      filters,
      panelFilters,
      query.query,
    ]
  );

  const getDiscoverRedirectUrl = useCallback(
    (entity?: InventoryEntity) => getDiscoverEntitiesRedirectUrl(entity),
    [getDiscoverEntitiesRedirectUrl]
  );

  return { getDiscoverRedirectUrl };
};
