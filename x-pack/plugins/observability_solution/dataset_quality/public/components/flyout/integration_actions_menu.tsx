/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { Integration } from '../../../common/data_streams_stats/integration';
import { useDatasetQualityFlyout } from '../../hooks';
import { useFlyoutIntegrationActions } from '../../hooks/use_flyout_integration_actions';
const seeIntegrationText = i18n.translate('xpack.datasetQuality.flyoutSeeIntegrationActionText', {
  defaultMessage: 'See integration',
});

const indexTemplateText = i18n.translate('xpack.datasetQuality.flyoutIndexTemplateActionText', {
  defaultMessage: 'Index template',
});

const viewDashboardsText = i18n.translate('xpack.datasetQuality.flyoutViewDashboardsActionText', {
  defaultMessage: 'View dashboards',
});

export function IntegrationActionsMenu({ integration }: { integration: Integration }) {
  const { type, name } = useDatasetQualityFlyout().dataStreamStat!;
  const { dashboards = [], version, name: integrationName } = integration;
  const {
    isOpen,
    handleCloseMenu,
    handleToggleMenu,
    getIntegrationOverviewLinkProps,
    getIndexManagementLinkProps,
    getDashboardLinkProps,
  } = useFlyoutIntegrationActions();

  const actionButton = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      onClick={handleToggleMenu}
      data-test-subj="datasetQualityFlyoutIntegrationActionsButton"
    />
  );

  const MenuActionItem = ({
    dataTestSubject,
    buttonText,
    routerLinkProps,
    iconType,
  }: {
    dataTestSubject: string;
    buttonText: string;
    routerLinkProps: RouterLinkProps;
    iconType: string;
  }) => (
    <EuiButtonEmpty
      {...routerLinkProps}
      size="s"
      css={css`
        font-weight: normal;
      `}
      color="text"
      iconType={iconType}
      data-test-subj={dataTestSubject}
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  const panelItems = useMemo(() => {
    const firstLevelItems: EuiContextMenuPanelItemDescriptor[] = [
      {
        renderItem: () => (
          <MenuActionItem
            buttonText={seeIntegrationText}
            dataTestSubject="datasetQualityFlyoutIntegrationActionOverview"
            routerLinkProps={getIntegrationOverviewLinkProps(integrationName, version)}
            iconType="package"
          />
        ),
      },
      {
        renderItem: () => (
          <MenuActionItem
            buttonText={indexTemplateText}
            dataTestSubject="datasetQualityFlyoutIntegrationActionTemplate"
            routerLinkProps={getIndexManagementLinkProps({
              sectionId: 'data',
              appId: `index_management/templates/${type}-${name}`,
            })}
            iconType="indexPatternApp"
          />
        ),
      },
      {
        isSeparator: true,
        key: 'sep',
      },
    ];

    if (dashboards.length) {
      firstLevelItems.push({
        icon: 'dashboardApp',
        panel: 1,
        name: viewDashboardsText,
        'data-test-subj': 'datasetQualityFlyoutIntegrationActionViewDashboards',
      });
    }

    const panel: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        items: firstLevelItems,
      },
      {
        id: 1,
        title: viewDashboardsText,
        items: dashboards.map((dashboard) => {
          return {
            renderItem: () => (
              <MenuActionItem
                buttonText={dashboard.title}
                dataTestSubject="datasetQualityFlyoutIntegrationActionDashboard"
                routerLinkProps={getDashboardLinkProps(dashboard)}
                iconType="dashboardApp"
              />
            ),
          };
        }),
      },
    ];

    return panel;
  }, [
    dashboards,
    getDashboardLinkProps,
    getIndexManagementLinkProps,
    getIntegrationOverviewLinkProps,
    integrationName,
    name,
    type,
    version,
  ]);

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={actionButton}
      isOpen={isOpen}
      closePopover={handleCloseMenu}
    >
      <EuiContextMenu size="s" panels={panelItems} initialPanelId={0} />
    </EuiPopover>
  );
}
