/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Entity } from '@kbn/entities-api-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';
import { useKibana } from '../../hooks/use_kibana';
import { useEntitiesAppRouter } from '../../hooks/use_entities_app_router';
import { useEntitiesAppFetch } from '../../hooks/use_entities_app_fetch';
import { LoadingPanel } from '../loading_panel';
import { useEntitiesAppBreadcrumbs } from '../../hooks/use_entities_app_breadcrumbs';
import { EntitiesAppPageHeader } from '../entities_app_page_header';
import { EntitiesAppPageHeaderTitle } from '../entities_app_page_header/entities_app_page_header_title';
import { EntityDetailViewHeaderSection } from '../entity_detail_view_header_section';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { EntityDetailOverview } from '../entity_detail_overview';

interface TabDependencies {
  entity: Entity;
  dataStreams: Array<{ name: string }>;
}

interface Tab {
  name: string;
  label: string;
  content: React.ReactElement;
}

export function EntityDetailViewWithoutParams({
  tab,
  entityKey: key,
  type,
  getAdditionalTabs,
}: {
  tab: string;
  entityKey: string;
  type: string;
  getAdditionalTabs?: (dependencies: TabDependencies) => Tab[];
}) {
  const {
    dependencies: {
      start: {
        data,
        entitiesAPI: { entitiesAPIClient },
      },
    },
    services: {},
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const router = useEntitiesAppRouter();

  const theme = useEuiTheme().euiTheme;

  const entityFetch = useEntitiesAppFetch(
    ({ signal }) => {
      return entitiesAPIClient.fetch('GET /internal/entities_api/entity/{type}/{key}', {
        signal,
        params: {
          path: {
            type,
            key: encodeURIComponent(key),
          },
        },
      });
    },
    [type, key, entitiesAPIClient]
  );

  const typeDefinition = entityFetch.value?.typeDefinition;

  const entity = entityFetch.value?.entity;

  useEntitiesAppBreadcrumbs(() => {
    if (!typeDefinition || !entity) {
      return [];
    }

    return [
      {
        title: typeDefinition.displayName,
        path: `/{type}`,
        params: { path: { type } },
      } as const,
      {
        title: entity.displayName,
        path: `/{type}/{key}`,
        params: { path: { type, key } },
      } as const,
    ];
  }, [type, key, entity?.displayName, typeDefinition]);

  const entityDataStreamsFetch = useEntitiesAppFetch(
    async ({ signal }) => {
      return entitiesAPIClient.fetch(
        'GET /internal/entities_api/entity/{type}/{key}/data_streams',
        {
          signal,
          params: {
            path: {
              type,
              key: encodeURIComponent(key),
            },
            query: {
              start: String(start),
              end: String(end),
            },
          },
        }
      );
    },
    [key, type, entitiesAPIClient, start, end]
  );

  const dataStreams = entityDataStreamsFetch.value?.dataStreams;

  if (!entity || !typeDefinition || !dataStreams) {
    return <LoadingPanel />;
  }

  const tabs = {
    overview: {
      href: router.link('/{type}/{key}/{tab}', {
        path: { type, key, tab: 'overview' },
      }),
      label: i18n.translate('xpack.entities.entityDetailView.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: (
        <EntityDetailOverview
          dataStreams={dataStreams}
          entity={entity}
          typeDefinition={typeDefinition}
        />
      ),
    },
    ...Object.fromEntries(
      getAdditionalTabs?.({
        entity,
        dataStreams,
      }).map(({ name, ...rest }) => [
        name,
        {
          ...rest,
          href: router.link(`/{type}/{key}/{tab}`, {
            path: {
              type,
              key,
              tab: name,
            },
          }),
        },
      ]) ?? []
    ),
  };

  const selectedTab = tabs[tab as keyof typeof tabs];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EntitiesAppPageHeader>
        <EntitiesAppPageHeaderTitle title={entity.displayName}>
          <EuiHorizontalRule margin="s" />
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            className={css`
              padding-top: 0;
              padding-bottom: 0;
            `}
          >
            <EuiFlexGroup
              direction="row"
              alignItems="flexStart"
              className={css`
                > div {
                  border: 0px solid ${theme.colors.lightShade};
                  border-right-width: 1px;
                  width: 25%;
                }
                > div:last-child {
                  border-right-width: 0;
                }
              `}
            >
              <EuiFlexItem grow={false}>
                <EntityDetailViewHeaderSection
                  title={i18n.translate('xpack.entities.entityDetailView.typeSection', {
                    defaultMessage: 'Type',
                  })}
                >
                  <EuiFlexItem
                    className={css`
                      align-self: flex-start;
                    `}
                  >
                    <EuiBadge>{type}</EuiBadge>
                  </EuiFlexItem>
                </EntityDetailViewHeaderSection>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EntitiesAppPageHeaderTitle>
      </EntitiesAppPageHeader>
      <EntityOverviewTabList
        tabs={Object.entries(tabs).map(([tabKey, { label, href }]) => {
          return {
            name: tabKey,
            label,
            href,
            selected: tab === tabKey,
          };
        })}
      />
      {selectedTab.content}
    </EuiFlexGroup>
  );
}

export function EntityDetailView() {
  const {
    path: { type, key, tab },
  } = useEntitiesAppParams('/{type}/{key}/{tab}');

  return <EntityDetailViewWithoutParams type={type} entityKey={key} tab={tab} />;
}
