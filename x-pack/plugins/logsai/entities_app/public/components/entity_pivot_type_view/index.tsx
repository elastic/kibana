/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { EntityTable } from '../entity_table';
import { EntitiesAppPageHeader } from '../entities_app_page_header';
import { EntitiesAppPageHeaderTitle } from '../entities_app_page_header/entities_app_page_header_title';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';
import { useKibana } from '../../hooks/use_kibana';

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

  const typesFetch = useAbortableAsync(
    ({ signal }) => {
      return entitiesAPIClient.fetch('POST /internal/entities_api/pivots/metadata', {
        signal,
        params: {
          body: {
            types: [type],
          },
        },
      });
    },
    [entitiesAPIClient, type]
  );

  const title = typesFetch.value?.pivots[0]?.displayName ?? '';

  return (
    <EuiFlexGroup direction="column">
      <EntitiesAppPageHeader>
        <EntitiesAppPageHeaderTitle title={title} />
      </EntitiesAppPageHeader>
      <EntityTable type={type} />
    </EuiFlexGroup>
  );
}
