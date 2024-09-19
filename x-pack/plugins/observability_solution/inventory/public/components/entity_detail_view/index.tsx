/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import React, { useMemo, useState } from 'react';
import { uniqBy } from 'lodash';
import { css } from '@emotion/css';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import type { Entity, EntityDefinition } from '../../../common/entities';
import { useInventoryBreadcrumbs } from '../../hooks/use_inventory_breadcrumbs';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { getDataStreamsForEntity } from '../../util/entities/get_data_streams_for_entity';
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

  const { absoluteTimeRange } = useDateRange({ data });

  const router = useInventoryRouter();

  const {
    services: { inventoryAPIClient },
    dependencies: {
      start: { datasetQuality, share },
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

  const dashboardLocator = useMemo(
    () => share.url.locators.get(DASHBOARD_APP_LOCATOR),
    [share.url.locators]
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
        start: absoluteTimeRange.start,
        end: absoluteTimeRange.end,
        identityFields: typeDefinition.identityFields,
        sources: typeDefinition.sources,
      });
    },
    [
      entity,
      typeDefinition,
      inventoryAPIClient,
      absoluteTimeRange.start,
      absoluteTimeRange.end,
      displayName,
    ]
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
        .then((response) => response.dataStreams);
    },
    [datasetQuality, entityDataStreamsFetch.value]
  );

  const dataStreams = entityDataStreamsFetch.value?.dataStreams;

  const dataStreamsWithIntegrations = integrationsFetch.value;

  const quickLinksAsync = useAbortableAsync(async () => {
    if (!entity || !typeDefinition || !dataStreamsWithIntegrations?.length) {
      return [];
    }

    const allPromises = dataStreamsWithIntegrations.flatMap((dataStream) => {
      if (!dataStream.integration || !dataStream.dashboards?.length) {
        return [];
      }
      return dataStream.dashboards.map(async (dashboard) => {
        const query =
          typeDefinition.identityFields
            .map((identityField) => {
              const value = entity.properties[identityField.field];
              if (!value) {
                return `(NOT ${identityField.field}:*)`;
              }
              return `(${identityField.field}:${value})`;
            })
            .join(' AND ') ?? '';

        const href = await dashboardLocator?.getRedirectUrl({
          dashboardId: dashboard.id,
          query: query ? { query, language: 'kuery' } : undefined,
        });

        return {
          group: i18n.translate('xpack.inventory.entityDetailView.quickLinks.dashboards', {
            defaultMessage: 'Dashboards',
          }),
          label: dashboard.title,
          href,
        };
      });
    });

    const quickLinks = await await Promise.all(allPromises);

    return uniqBy(quickLinks, (link) => link.label);
  }, [dataStreamsWithIntegrations, dashboardLocator, entity, typeDefinition]);

  const [isQuickLinksPopoverOpen, setIsQuickLinksPopoverOpen] = useState(false);

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

  const quickLinksLoading = quickLinksAsync.loading || integrationsFetch.loading;

  const quickLinks = quickLinksAsync.value ?? [];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle title={displayName}>
          <EuiBadge>{type}</EuiBadge>
          {quickLinks.length ? (
            <EuiPopover
              button={
                <EuiButtonEmpty
                  data-test-subj="inventoryEntityDetailViewQuickLinksButton"
                  iconType="link"
                  onClick={() => {
                    setIsQuickLinksPopoverOpen((prev) => !prev);
                  }}
                >
                  {i18n.translate('xpack.inventory.entityDetailView.quickLinksButtonLabel', {
                    defaultMessage: 'Dashboards',
                  })}
                </EuiButtonEmpty>
              }
              isOpen={isQuickLinksPopoverOpen}
              closePopover={() => {
                setIsQuickLinksPopoverOpen(() => false);
              }}
            >
              <EuiListGroup
                className={css`
                  max-height: 256px;
                  overflow-y: auto;
                `}
              >
                {quickLinks.map((quickLink) => {
                  return (
                    <EuiListGroupItem
                      key={quickLink.label}
                      label={quickLink.label}
                      href={quickLink.href}
                      size="xs"
                    />
                  );
                })}
              </EuiListGroup>
            </EuiPopover>
          ) : quickLinksLoading ? (
            <EuiLoadingSpinner size="s" />
          ) : null}
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
