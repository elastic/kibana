/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { EntityDetailViewHeaderSection } from '../entity_detail_view_header_section';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';

export interface EntityViewTab {
  name: string;
  label: string;
  content: React.ReactElement;
}

export function EntityDetailViewWithoutParams({
  selectedTab,
  tabs,
  type,
  entity,
}: {
  selectedTab: string;
  tabs: EntityViewTab[];
  type: {
    displayName?: string;
    id: string;
  };
  entity: {
    displayName?: string;
    id: string;
  };
}) {
  const router = useStreamsAppRouter();

  const theme = useEuiTheme().euiTheme;

  useStreamsAppBreadcrumbs(() => {
    if (!type.displayName || !entity.displayName) {
      return [];
    }

    return [
      {
        title: type.displayName,
        path: `/`,
      } as const,
      {
        title: entity.displayName,
        path: `/{key}`,
        params: { path: { key: entity.id } },
      } as const,
    ];
  }, [type.displayName, type.id, entity.displayName, entity.id]);

  if (!type.displayName || !entity.displayName) {
    return <LoadingPanel />;
  }

  const tabMap = Object.fromEntries(
    tabs.map((tab) => {
      return [
        tab.name,
        {
          href: router.link('/{key}/{tab}', {
            path: { key: entity.id, tab: 'overview' },
          }),
          label: tab.label,
          content: tab.content,
        },
      ];
    })
  );

  const selectedTabObject = tabMap[selectedTab];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <StreamsAppPageHeader>
        <StreamsAppPageHeaderTitle title={entity.displayName}>
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
                  title={i18n.translate('xpack.streams.entityDetailView.typeSection', {
                    defaultMessage: 'Type',
                  })}
                >
                  <EuiFlexItem
                    className={css`
                      align-self: flex-start;
                    `}
                  >
                    <EuiBadge>{type.displayName}</EuiBadge>
                  </EuiFlexItem>
                </EntityDetailViewHeaderSection>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </StreamsAppPageHeaderTitle>
      </StreamsAppPageHeader>
      <EntityOverviewTabList
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => {
          return {
            name: tabKey,
            label,
            href,
            selected: selectedTab === tabKey,
          };
        })}
      />
      {selectedTabObject.content}
    </EuiFlexGroup>
  );
}
