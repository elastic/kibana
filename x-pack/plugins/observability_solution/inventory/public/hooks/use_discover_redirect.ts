/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { InventoryEntity } from '../../common/entities';
import { useKibana } from './use_kibana';
import { useFetchEntityDefinition } from './use_fetch_entity_definition';
import { useAdHocDataView } from './use_adhoc_data_view';

export const useDiscoverRedirect = (entity: InventoryEntity) => {
  const {
    services: { share, application, entityManager },
  } = useKibana();
  const { entityDefinitions, isEntityDefinitionLoading } = useFetchEntityDefinition(
    entity.entityDefinitionId
  );

  const title = useMemo(
    () =>
      !isEntityDefinitionLoading && entityDefinitions && entityDefinitions?.length > 0
        ? entityDefinitions[0]?.indexPatterns?.join(',')
        : '',
    [entityDefinitions, isEntityDefinitionLoading]
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

  return { getDiscoverEntitiesRedirectUrl, isEntityDefinitionLoading };
};
