/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppPageBody } from '../streams_app_page_body';
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
  entity,
}: {
  selectedTab: string;
  tabs: EntityViewTab[];
  entity: {
    displayName?: string;
    id: string;
  };
}) {
  const router = useStreamsAppRouter();
  useStreamsAppBreadcrumbs(() => {
    if (!entity.displayName) {
      return [];
    }

    return [
      {
        title: entity.displayName,
        path: `/{key}`,
        params: { path: { key: entity.id } },
      } as const,
    ];
  }, [entity.displayName, entity.id]);

  if (!entity.displayName) {
    return <LoadingPanel />;
  }

  const tabMap = Object.fromEntries(
    tabs.map((tab) => {
      return [
        tab.name,
        {
          href: router.link('/{key}/{tab}', {
            path: { key: entity.id, tab: tab.name },
          }),
          label: tab.label,
          content: tab.content,
        },
      ];
    })
  );

  const selectedTabObject = tabMap[selectedTab];

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPanel color="transparent">
          <EuiLink data-test-subj="streamsEntityDetailViewGoBackHref" href={router.link('/')}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiIcon type="arrowLeft" />
              {i18n.translate('xpack.streams.entityDetailView.goBackLinkLabel', {
                defaultMessage: 'Back',
              })}
            </EuiFlexGroup>
          </EuiLink>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StreamsAppPageHeader
          verticalPaddingSize="none"
          title={<StreamsAppPageHeaderTitle title={entity.displayName} />}
        >
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
        </StreamsAppPageHeader>
      </EuiFlexItem>
      <StreamsAppPageBody>{selectedTabObject.content}</StreamsAppPageBody>
    </EuiFlexGroup>
  );
}
