/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiLink, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { SERVICE_FLYOUT_EBT_ACTIONS, SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ServiceBadges } from './service_badges';
import { SERVICE_FLYOUT_TABS, type ServiceFlyoutTabId } from '..';
import { useServiceFlyoutLinks } from '../hooks/use_service_flyout_links';

interface ServiceFlyoutHeaderProps {
  title: string;
  titleId: string;
  selectedTabId: ServiceFlyoutTabId;
  onSelectedTabIdChange: (tabId: ServiceFlyoutTabId) => void;
}

export function ServiceFlyoutHeader({
  title,
  titleId,
  selectedTabId,
  onSelectedTabIdChange,
}: ServiceFlyoutHeaderProps) {
  const { apm } = useServiceFlyoutLinks();
  const serviceOverviewHref = apm.overviewTab;

  return (
    <EuiFlyoutHeader>
      <EuiTitle size="s">
        <h2 id={titleId} data-test-subj="serviceFlyoutTitle">
          <EuiLink
            href={serviceOverviewHref}
            data-test-subj="serviceFlyoutTitleLink"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
              element: SERVICE_FLYOUT_EBT_ELEMENTS.TITLE,
            })}
          >
            {title}
          </EuiLink>
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ServiceBadges />
      <EuiSpacer size="s" />
      <EuiTabs data-test-subj="serviceFlyoutTabs">
        {SERVICE_FLYOUT_TABS.map(({ id, label }) => (
          <EuiTab
            key={id}
            isSelected={id === selectedTabId}
            onClick={() => onSelectedTabIdChange(id)}
            data-test-subj={`serviceFlyoutTab-${id}`}
            {...getEbtProps({
              action: SERVICE_FLYOUT_EBT_ACTIONS.VIEW_TAB,
              element: SERVICE_FLYOUT_EBT_ELEMENTS.TABS,
              detail: id,
            })}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
    </EuiFlyoutHeader>
  );
}
