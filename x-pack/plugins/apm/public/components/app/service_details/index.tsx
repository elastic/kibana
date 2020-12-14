/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ApmHeader } from '../../shared/ApmHeader';
import { ServiceIcons } from './service_icons';
import { ServiceDetailsContextProvider } from './service_icons/service_details_context';
import { ServiceDetailTabs } from './service_detail_tabs';

interface Props extends RouteComponentProps<{ serviceName: string }> {
  tab: React.ComponentProps<typeof ServiceDetailTabs>['tab'];
}

export function ServiceDetails({ match, tab }: Props) {
  const { serviceName } = match.params;

  return (
    <div>
      <ApmHeader>
        <ServiceDetailsContextProvider serviceName={serviceName}>
          <ServiceIcons serviceName={serviceName} />
        </ServiceDetailsContextProvider>
      </ApmHeader>
      <ServiceDetailTabs serviceName={serviceName} tab={tab} />
    </div>
  );
}
