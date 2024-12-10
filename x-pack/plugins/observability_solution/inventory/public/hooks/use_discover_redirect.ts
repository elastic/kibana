/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { InventoryEntity } from '../../common/entities';
import { useAdHocDataView } from './use_adhoc_data_view';
import { useFetchEntityDefinitionIndexPattern } from './use_fetch_entity_definition_index_patterns';
import { useKibana } from './use_kibana';

export const useDiscoverRedirect = (entity: InventoryEntity) => {
  const {
    services: { share, application, entityManager },
  } = useKibana();
  const { entityDefinitionIndexPatterns, isEntityDefinitionIndexPatternsLoading } =
    useFetchEntityDefinitionIndexPattern(entity.entityType);

  const title = useMemo(
    () =>
      !isEntityDefinitionIndexPatternsLoading &&
      (entityDefinitionIndexPatterns ?? []).length > 0
        ? entityDefinitionIndexPatterns[0].join()
        : '',
    [entityDefinitionIndexPatterns, isEntityDefinitionIndexPatternsLoading]
  );

  const { dataView } = useAdHocDataView(title);

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(() => {
    const entityKqlFilter = entity
      ? entityManager.entityClient.asKqlFilter({
          entity: {
            identity_fields: entity.entityIdentityFields,
          },
          ...entity,
        })
      : '';

    return application.capabilities.discover?.show
      ? discoverLocator?.getRedirectUrl({
          indexPatternId: dataView?.id ?? '',
          query: { query: entityKqlFilter, language: 'kuery' },
        })
      : undefined;
  }, [
    application.capabilities.discover?.show,
    dataView?.id,
    discoverLocator,
    entity,
    entityManager.entityClient,
  ]);

  return { getDiscoverEntitiesRedirectUrl, isEntityDefinitionIndexPatternsLoading };
};
