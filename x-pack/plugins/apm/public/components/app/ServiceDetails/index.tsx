/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ApmHeader } from '../../shared/ApmHeader';
import { ServiceDetailTabs } from './ServiceDetailTabs';

interface Props extends RouteComponentProps<{ serviceName: string }> {
  tab: React.ComponentProps<typeof ServiceDetailTabs>['tab'];
}

export function ServiceDetails({ match, tab }: Props) {
  const { serviceName } = match.params;

  return (
    <div>
      <ApmHeader>
        <EuiTitle>
          <h1>{serviceName}</h1>
        </EuiTitle>
      </ApmHeader>
      <ServiceDetailTabs serviceName={serviceName} tab={tab} />
    </div>
  );
}
