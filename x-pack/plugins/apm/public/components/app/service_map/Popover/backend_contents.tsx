/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect, useState } from 'react';
import { ContentsProps } from '.';
import { NodeStats } from '../../../../../common/service_map';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { CytoscapeContext } from '../Cytoscape';
import { StatsList } from './stats_list';

export function BackendContents({ nodeData }: ContentsProps) {
  const apmRouter = useApmRouter();
  const {
    urlParams: { environment, start, end },
  } = useUrlParams();

  const backendName = nodeData.label;

  // We only want the backend stats for services upstream in the current view of
  // the map. Get the ids for the upstream services and use them in the API request.
  const [upstreamServices, setUpstreamServices] = useState<string[]>([]);
  const cy = useContext(CytoscapeContext);
  useEffect(() => {
    if (cy) {
      setUpstreamServices(
        cy
          .getElementById(nodeData.id!)
          .connectedEdges()
          .map((edge) => edge.source().id())
      );
    }
  }, [cy, environment, nodeData.id, start, end]);

  const { data = { transactionStats: {} } as NodeStats, status } = useFetcher(
    (callApmApi) => {
      if (backendName && start && end && upstreamServices.length > 0) {
        return callApmApi({
          endpoint: 'GET /api/apm/service-map/backend/{backendName}',
          params: {
            path: { backendName },
            query: {
              environment,
              start,
              end,
              upstreamServices: JSON.stringify(upstreamServices),
            },
          },
        });
      }
    },
    [environment, backendName, start, end, upstreamServices],
    {
      preservePreviousData: false,
    }
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const detailsUrl = apmRouter.link('/backends/:backendName/overview', {
    path: { backendName },
  });

  return (
    <>
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.backendDetailsButtonText', {
            defaultMessage: 'Backend Details',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
