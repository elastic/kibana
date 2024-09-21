/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { uniqBy } from 'lodash';
import React, { useMemo } from 'react';
import type { Entity, EntityDefinition } from '../../../common/entities';
import { useInventoryBreadcrumbs } from '../../hooks/use_inventory_breadcrumbs';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { getDataStreamsForEntity } from '../../util/entities/get_data_streams_for_entity';
import { EntityAssetView } from '../entity_asset_view';
import { EntityMetadata } from '../entity_metadata';
import { EntityOverview } from '../entity_overview';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { EntityRelationshipsView } from '../entity_relationships_view';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { LoadingPanel } from '../loading_panel';

interface TabDependencies {
  entity: Entity;
  typeDefinition: EntityDefinition;
  dataStreams: Array<{ name: string }>;
}

interface Tab {
  name: string;
  label: string;
  content: React.ReactElement;
}

export function EntityDetailViewWithoutParams({
  tab,
  displayName,
  type,
  getAdditionalTabs,
}: {
  tab: string;
  displayName: string;
  type: string;
  getAdditionalTabs?: (dependencies: TabDependencies) => Tab[];
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const router = useInventoryRouter();

  const {
    services: { inventoryAPIClient },
    dependencies: {
      start: { datasetQuality },
    },
  } = useKibana();

  const entityFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entity/{type}/{displayName}', {
        signal,
        params: {
          path: {
            type,
            displayName,
          },
        },
      });
    },
    [type, displayName, inventoryAPIClient]
  );

  const typeDefinitionsFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/definition/inventory', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  const typeDefinition = typeDefinitionsFetch.value?.definitions.find(
    (definition) => definition.type === type
  );

  const entity = useMemo<Entity | undefined>(() => {
    if (!entityFetch.value) {
      return undefined;
    }

    return entityFetch.value.entity;
  }, [entityFetch.value]);

  useInventoryBreadcrumbs(() => {
    if (!typeDefinition) {
      return [];
    }

    return [
      {
        title: typeDefinition.label,
        path: `/{type}`,
        params: { path: { type } },
      } as const,
      {
        title: displayName,
        path: `/{type}/{displayName}`,
        params: { path: { type, displayName } },
      } as const,
    ];
  }, [displayName, type, typeDefinition]);

  const entityDataStreamsFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!entity || !typeDefinition) {
        return undefined;
      }
      if (typeDefinition.type === 'data_stream') {
        return {
          dataStreams: [
            {
              name: displayName,
            },
          ],
        };
      }
      return getDataStreamsForEntity({
        entity,
        inventoryAPIClient,
        signal,
        start,
        end,
        identityFields: typeDefinition.identityFields,
        sources: typeDefinition.sources,
      });
    },
    [entity, typeDefinition, inventoryAPIClient, start, end, displayName]
  );

  const integrationsFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!entityDataStreamsFetch.value) {
        return undefined;
      }

      const dataStreams = entityDataStreamsFetch.value.dataStreams;

      if (!dataStreams.length) {
        return Promise.resolve([]);
      }

      return datasetQuality
        .apiClient('POST /internal/dataset_quality/data_streams/integrations', {
          signal,
          params: {
            body: {
              dataStreams: dataStreams
                .map((dataStream) => dataStream.name)
                .filter((dataStream) => !dataStream.includes(':')),
            },
          },
        })
        .then((response) => {
          return response.dataStreams;
        });
    },
    [datasetQuality, entityDataStreamsFetch.value]
  );

  const dashboardsWithDataFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!integrationsFetch.value || !entity) {
        return undefined;
      }

      const dataStreams = integrationsFetch.value;

      const allDashboards = uniqBy(
        dataStreams.flatMap((dataStream) => dataStream.dashboards ?? []),
        (dashboard) => dashboard.id
      );

      const { dashboards } = await inventoryAPIClient.fetch(
        'POST /internal/inventory/entities/check_dashboards_for_data',
        {
          signal,
          params: {
            body: {
              dashboardIds: allDashboards.map((db) => db.id),
              entity: {
                type: entity.type,
                displayName: entity.displayName,
              },
              start,
              end,
            },
          },
        }
      );

      return Object.fromEntries(
        dashboards.map((check) => {
          const withData = check.panels.filter((panel) => panel.check === 'has_data');
          const withoutData = check.panels.filter((panel) => panel.check === 'has_no_data');
          const unknown = check.panels.filter((panel) => panel.check === 'unknown');
          return [check.id, withData.length / (withoutData.length + unknown.length)];
        })
      );
    },
    [inventoryAPIClient, integrationsFetch.value, entity, start, end]
  );

  const dataStreams = entityDataStreamsFetch.value?.dataStreams;

  const dataStreamsWithIntegrations = integrationsFetch.value;

  if (!entity || !typeDefinition || !dataStreams) {
    return <LoadingPanel />;
  }

  const tabs = {
    overview: {
      href: router.link('/{type}/{displayName}/{tab}', {
        path: { type, displayName, tab: 'overview' },
      }),
      label: i18n.translate('xpack.inventory.entityDetailView.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: (
        <EntityOverview
          entity={entity}
          typeDefinition={typeDefinition}
          allTypeDefinitions={typeDefinitionsFetch.value!.definitions}
          dataStreams={dataStreams}
          dataStreamsWithIntegrations={dataStreamsWithIntegrations}
        />
      ),
    },
    metadata: {
      href: router.link('/{type}/{displayName}/{tab}', {
        path: { type, displayName, tab: 'metadata' },
      }),
      label: i18n.translate('xpack.inventory.entityDetailView.metadataTabLabel', {
        defaultMessage: 'Metadata',
      }),
      content: <EntityMetadata entity={entity} />,
    },
    assets: {
      href: router.link('/{type}/{displayName}/{tab}', {
        path: { type, displayName, tab: 'assets' },
      }),
      label: i18n.translate('xpack.inventory.entityDetailView.assets', {
        defaultMessage: 'Assets',
      }),
      content: <EntityAssetView entity={entity} identityFields={typeDefinition.identityFields} />,
    },
    relationships: {
      href: router.link('/{type}/{displayName}/{tab}', {
        path: { type, displayName, tab: 'relationships' },
      }),
      label: i18n.translate('xpack.inventory.entityDetailView.relatedTabLabel', {
        defaultMessage: 'Relationships',
      }),
      content: <EntityRelationshipsView entity={entity} dataStreams={dataStreams} />,
    },
    ...Object.fromEntries(
      getAdditionalTabs?.({
        entity,
        typeDefinition,
        dataStreams,
      }).map(({ name, ...rest }) => [
        name,
        {
          ...rest,
          href: router.link(`/{type}/{displayName}/{tab}`, {
            path: {
              type,
              displayName,
              tab,
            },
          }),
        },
      ]) ?? []
    ),
  };

  const selectedTab = tabs[tab as keyof typeof tabs];
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle title={displayName}>
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

export function EntityDetailView() {
  const {
    path: { type, displayName, tab },
  } = useInventoryParams('/{type}/{displayName}/{tab}');

  return <EntityDetailViewWithoutParams type={type} displayName={displayName} tab={tab} />;
}
