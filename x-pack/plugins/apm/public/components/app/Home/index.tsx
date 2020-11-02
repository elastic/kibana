/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabs, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { $ElementType } from 'utility-types';
import { ApmHeader } from '../../shared/ApmHeader';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { ServiceInventoryLink } from '../../shared/Links/apm/service_inventory_link';
import { TraceOverviewLink } from '../../shared/Links/apm/TraceOverviewLink';
import { ServiceMap } from '../ServiceMap';
import { ServiceInventory } from '../service_inventory';
import { TraceOverview } from '../TraceOverview';

const homeTabs = [
  {
    link: (
      <ServiceInventoryLink>
        {i18n.translate('xpack.apm.home.servicesTabLabel', {
          defaultMessage: 'Services',
        })}
      </ServiceInventoryLink>
    ),
    render: () => <ServiceInventory />,
    name: 'services',
  },
  {
    link: (
      <TraceOverviewLink>
        {i18n.translate('xpack.apm.home.tracesTabLabel', {
          defaultMessage: 'Traces',
        })}
      </TraceOverviewLink>
    ),
    render: () => <TraceOverview />,
    name: 'traces',
  },
  {
    link: (
      <ServiceMapLink>
        {i18n.translate('xpack.apm.home.serviceMapTabLabel', {
          defaultMessage: 'Service Map',
        })}
      </ServiceMapLink>
    ),
    render: () => <ServiceMap />,
    name: 'service-map',
  },
];

interface Props {
  tab: 'traces' | 'services' | 'service-map';
}

export function Home({ tab }: Props) {
  const selectedTab = homeTabs.find(
    (homeTab) => homeTab.name === tab
  ) as $ElementType<typeof homeTabs, number>;

  return (
    <div>
      <ApmHeader>
        <EuiTitle size="l">
          <h1>APM</h1>
        </EuiTitle>
      </ApmHeader>
      <EuiTabs>
        {homeTabs.map((homeTab) => (
          <EuiTabLink isSelected={homeTab === selectedTab} key={homeTab.name}>
            {homeTab.link}
          </EuiTabLink>
        ))}
      </EuiTabs>
      {selectedTab.render()}
    </div>
  );
}
