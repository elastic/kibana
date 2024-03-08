/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { TreemapSelect, TreemapTypes } from './treemap_select';
import { TreemapChart } from '../../../../shared/charts/treemap_chart';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import {
  DEVICE_MODEL_IDENTIFIER,
  HOST_OS_VERSION,
  SERVICE_VERSION,
} from '../../../../../../common/es_fields/apm';

const ES_FIELD_MAPPING: Record<TreemapTypes, string> = {
  [TreemapTypes.Devices]: DEVICE_MODEL_IDENTIFIER,
  [TreemapTypes.AppVersions]: SERVICE_VERSION,
  [TreemapTypes.OsVersions]: HOST_OS_VERSION,
};

export function MobileTreemap({
  kuery,
  serviceName,
  start,
  end,
  environment,
}: {
  kuery: string;
  serviceName: string;
  start: string;
  end: string;
  environment: string;
}) {
  const [selectedTreemap, selectTreemap] = useState(TreemapTypes.Devices);

  const { data, status } = useFetcher(
    (callApmApi) => {
      const fieldName = ES_FIELD_MAPPING[selectedTreemap];
      if (fieldName) {
        return callApmApi(
          'GET /internal/apm/mobile-services/{serviceName}/terms',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                environment,
                kuery,
                start,
                end,
                fieldName,
                size: 500,
              },
            },
          }
        );
      }
    },
    [environment, kuery, serviceName, start, end, selectedTreemap]
  );
  return (
    <>
      <TreemapSelect
        selectedTreemap={selectedTreemap}
        onChange={selectTreemap}
      />
      <EuiSpacer size="s" />
      <TreemapChart
        fetchStatus={status}
        data={data?.terms ?? []}
        id="device-treemap"
        height={320}
      />
    </>
  );
}
