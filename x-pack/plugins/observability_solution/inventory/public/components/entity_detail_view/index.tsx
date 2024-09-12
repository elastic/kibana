/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Required } from 'utility-types';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventoryBreadcrumbs } from '../../hooks/use_inventory_breadcrumbs';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { useKibana } from '../../hooks/use_kibana';
import type { Entity, EntityTypeDefinition } from '../../../common/entities';
import { esqlResultToPlainObjects } from '../../util/esql_result_to_plain_objects';
import { LoadingPanel } from '../loading_panel';
import { EntityOverview } from '../entity_overview';
import { EntityMetadata } from '../entity_metadata';
import { EntityRelationshipsView } from '../entity_relationships_view';

export function EntityDetailView<TEntity extends Entity>() {
  const {
    path: { type, id, tab },
  } = useInventoryParams('/{type}/{id}/{tab}');

  const entityQueryResult = useEsqlQueryResult({
    query: `FROM entities-*-latest | WHERE entity.type == "${type}" AND entity.displayName == "${id}" | LIMIT 1`,
  });

  const router = useInventoryRouter();

  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const typeDefinitionFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entity_types', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  const typeDefinition = typeDefinitionFetch.value?.definitions.find(
    (definition) => definition.discoveryDefinition?.type === type
  );

  const entity = useMemo<TEntity | undefined>(() => {
    if (!entityQueryResult.value) {
      return undefined;
    }

    const properties = esqlResultToPlainObjects<TEntity['properties']>(entityQueryResult.value)[0];

    return {
      id: properties['entity.id'],
      label: properties['entity.displayName'],
      type: properties['entity.type'],
      properties,
    } as TEntity;
  }, [entityQueryResult.value]);

  useInventoryBreadcrumbs(() => {
    if (!typeDefinition) {
      return [];
    }

    return [
      {
        title: typeDefinition?.discoveryDefinition?.name ?? typeDefinition.name,
        path: `/{type}`,
        params: { path: { id } },
      },
      { title: id, path: `/{type}/{id}`, params: { path: { id } } },
    ];
  }, [id]);

  if (!entity || !typeDefinition || !typeDefinition.discoveryDefinition) {
    return <LoadingPanel />;
  }

  const tabs = {
    overview: {
      href: router.link('/{type}/{id}/{tab}', { path: { type, id, tab: 'overview' } }),
      label: i18n.translate('xpack.inventory.entityDetailView.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: (
        <EntityOverview
          entity={entity}
          typeDefinition={typeDefinition as Required<EntityTypeDefinition, 'discoveryDefinition'>}
        />
      ),
    },
    metadata: {
      href: router.link('/{type}/{id}/{tab}', { path: { type, id, tab: 'metadata' } }),
      label: i18n.translate('xpack.inventory.entityDetailView.metadataTabLabel', {
        defaultMessage: 'Metadata',
      }),
      content: <EntityMetadata entity={entity} />,
    },
    relationships: {
      href: router.link('/{type}/{id}/{tab}', { path: { type, id, tab: 'relationships' } }),
      label: i18n.translate('xpack.inventory.entityDetailView.relatedTabLabel', {
        defaultMessage: 'Relationships',
      }),
      content: (
        <EntityRelationshipsView
          entity={entity}
          typeDefinition={typeDefinition as Required<EntityTypeDefinition, 'discoveryDefinition'>}
          allTypeDefinitions={typeDefinitionFetch.value!.definitions}
        />
      ),
    },
  };

  const selectedTab = tabs[tab as keyof typeof tabs];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle title={id}>
          <EuiBadge>{type}</EuiBadge>
        </InventoryPageHeaderTitle>
      </InventoryPageHeader>
      <EntityOverviewTabList
        tabs={Object.entries(tabs).map(([key, { label, href }]) => {
          return {
            name: key,
            label,
            href,
            selected: tab === key,
          };
        })}
      />
      {selectedTab.content}
    </EuiFlexGroup>
  );
}
