/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { EntityTable } from '../entity_table';
import { EntitiesAppPageHeader } from '../entities_app_page_header';
import { EntitiesAppPageHeaderTitle } from '../entities_app_page_header/entities_app_page_header_title';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';
import { useKibana } from '../../hooks/use_kibana';
import { useEntitiesAppFetch } from '../../hooks/use_entities_app_fetch';
import { useEntitiesAppBreadcrumbs } from '../../hooks/use_entities_app_breadcrumbs';

export function EntityPivotTypeView() {
  const {
    path: { type },
  } = useEntitiesAppParams('/{type}');

  const {
    dependencies: {
      start: {
        entitiesAPI: { entitiesAPIClient },
      },
    },
  } = useKibana();

  const typeDefinitionsFetch = useEntitiesAppFetch(
    ({ signal }) => {
      return entitiesAPIClient.fetch('GET /internal/entities_api/types/{type}', {
        signal,
        params: {
          path: {
            type,
          },
        },
      });
    },
    [entitiesAPIClient, type]
  );

  const typeDefinition = typeDefinitionsFetch.value?.typeDefinition;

  const title = typeDefinition?.displayName ?? '';

  useEntitiesAppBreadcrumbs(() => {
    if (!title) {
      return [];
    }
    return [
      {
        title,
        path: `/{type}`,
        params: { path: { type } },
      } as const,
    ];
  }, [title, type]);

  return (
    <EuiFlexGroup direction="column">
      <EntitiesAppPageHeader>
        <EntitiesAppPageHeaderTitle title={title} />
      </EntitiesAppPageHeader>
      <EntityTable type={type} />
    </EuiFlexGroup>
  );
}
