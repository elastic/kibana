/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ComponentType } from 'react';
import { $ElementType } from 'utility-types';
import { ApmHeader } from '../../shared/ApmHeader';
import { useServiceMapHref } from '../../shared/Links/apm/ServiceMapLink';
import { useServiceInventoryHref } from '../../shared/Links/apm/service_inventory_link';
import { useTraceOverviewHref } from '../../shared/Links/apm/TraceOverviewLink';
import { MainTabs } from '../../shared/main_tabs';
import { ServiceMap } from '../ServiceMap';
import { ServiceInventory } from '../service_inventory';
import { TraceOverview } from '../TraceOverview';

interface Tab {
  key: string;
  href: string;
  text: string;
  Component: ComponentType;
}

interface Props {
  tab: 'traces' | 'services' | 'service-map';
}

export function Home({ tab }: Props) {
  const homeTabs: Tab[] = [
    {
      key: 'services',
      href: useServiceInventoryHref(),
      text: i18n.translate('xpack.apm.home.servicesTabLabel', {
        defaultMessage: 'Services',
      }),
      Component: ServiceInventory,
    },
    {
      key: 'traces',
      href: useTraceOverviewHref(),
      text: i18n.translate('xpack.apm.home.tracesTabLabel', {
        defaultMessage: 'Traces',
      }),
      Component: TraceOverview,
    },
    {
      key: 'service-map',
      href: useServiceMapHref(),
      text: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
      Component: ServiceMap,
    },
  ];
  const selectedTab = homeTabs.find(
    (homeTab) => homeTab.key === tab
  ) as $ElementType<typeof homeTabs, number>;

  return (
    <>
      <ApmHeader>
        <EuiTitle>
          <h1>APM</h1>
        </EuiTitle>
      </ApmHeader>
      <MainTabs>
        {homeTabs.map(({ href, key, text }) => (
          <EuiTab href={href} isSelected={key === selectedTab.key} key={key}>
            {text}
          </EuiTab>
        ))}
      </MainTabs>
      <selectedTab.Component />
    </>
  );
}
