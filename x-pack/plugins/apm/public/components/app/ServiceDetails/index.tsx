/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceDetails } from '../../../services/rest/apm/services';
import { FilterBar } from '../../shared/FilterBar';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';
import { isRumAgentName } from '../../../../common/agent_name';
import { useUrlParams } from '../../../hooks/useUrlParams';

export function ServiceDetails() {
  const { urlParams } = useUrlParams();
  const { serviceName, start, end, kuery } = urlParams;
  const { data: serviceDetailsData } = useFetcher(
    () => {
      if (serviceName && start && end) {
        return loadServiceDetails({ serviceName, start, end, kuery });
      }
    },
    [serviceName, start, end, kuery]
  );

  if (!serviceDetailsData) {
    return null;
  }

  const isRumAgent = isRumAgentName(serviceDetailsData.agentName);

  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{urlParams.serviceName}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ServiceIntegrations
            transactionTypes={serviceDetailsData.types}
            urlParams={urlParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <FilterBar />

      <ServiceDetailTabs
        urlParams={urlParams}
        transactionTypes={serviceDetailsData.types}
        isRumAgent={isRumAgent}
        agentName={serviceDetailsData.agentName}
      />
    </React.Fragment>
  );
}
