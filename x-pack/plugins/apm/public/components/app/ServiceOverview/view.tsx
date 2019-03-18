/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceList } from '../../../services/rest/apm/services';
import { loadAgentStatus } from '../../../services/rest/apm/status_check';
import { NoServicesMessage } from './NoServicesMessage';
import { ServiceList } from './ServiceList';

interface Props {
  urlParams: IUrlParams;
}

export function ServiceOverview({ urlParams }: Props) {
  const { start, end, kuery } = urlParams;
  const { data: agentStatus = true } = useFetcher(loadAgentStatus, []);
  const { data: serviceListData } = useFetcher(loadServiceList, {
    start,
    end,
    kuery
  });

  return (
    <EuiPanel>
      <ServiceList
        items={serviceListData}
        noItemsMessage={<NoServicesMessage historicalDataFound={agentStatus} />}
      />
    </EuiPanel>
  );
}
