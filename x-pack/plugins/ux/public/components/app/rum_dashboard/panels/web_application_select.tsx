/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ServiceNameFilter } from '../url_filter/service_name_filter';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { RUM_AGENT_NAMES } from '../../../../../common/agent_name';

export function WebApplicationSelect() {
  const {
    rangeId,
    urlParams: { start, end },
  } = useLegacyUrlParams();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/ux/services', {
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify({ agentName: RUM_AGENT_NAMES }),
            },
          },
        });
      }
    },
    // `rangeId` works as a cache buster for ranges that never change, like `Today`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, rangeId]
  );

  const rumServiceNames = data?.rumServices ?? [];

  return (
    <ServiceNameFilter
      loading={status !== 'success'}
      serviceNames={rumServiceNames}
    />
  );
}
