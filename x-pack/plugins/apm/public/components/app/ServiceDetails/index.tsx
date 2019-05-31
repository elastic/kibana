/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceDetails } from '../../../services/rest/apm/services';
import { ApmHeader } from '../../shared/ApmHeader';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';
import { isRumAgentName } from '../../../../common/agent_name';
import { useUrlParams } from '../../../hooks/useUrlParams';

export function ServiceDetails() {
  const { urlParams, uiFilters } = useUrlParams();
  const { serviceName, start, end } = urlParams;
  const { data: serviceDetailsData } = useFetcher(
    () => {
      if (serviceName && start && end) {
        return loadServiceDetails({ serviceName, start, end, uiFilters });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  if (!serviceDetailsData) {
    return null;
  }

  const isRumAgent = isRumAgentName(serviceDetailsData.agentName);

  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceIntegrations
              transactionTypes={serviceDetailsData.types}
              urlParams={urlParams}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>

      <ServiceDetailTabs
        urlParams={urlParams}
        transactionTypes={serviceDetailsData.types}
        isRumAgent={isRumAgent}
        agentName={serviceDetailsData.agentName}
      />
    </div>
  );
}
