/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { Overview } from '../components/cluster/overview';

import { CODE_PATH_ALL } from '../../common/constants';

const CODE_PATHS = [CODE_PATH_ALL];

export const OverviewPage = () => {
  const [data, setData] = useState(undefined);
  const kibana = useKibana();

  useEffect(() => {
    // from services/clusters.js
    const fetchClusters = async () => {
      const url = '/api/monitoring/v1/clusters/dltQ_pDUTOW04Do08ltpdA';
      const max = moment();
      const min = moment().subtract(15, 'm');

      try {
        const response = await kibana.services.http.fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            css: undefined,
            timeRange: {
              min: min.toISOString(),
              max: max.toISOString(),
            },
            codePaths: CODE_PATHS,
          }),
        });

        setData(response[0]);
      } catch (err) {
        // TODO: handle error
      }
    };

    fetchClusters();
  }, [kibana.services.http]);

  return (
    <EuiErrorBoundary>
      {data && (
        <Overview cluster={data} alerts={{}} setupMode={false} showLicenseExpiration={false} />
      )}
    </EuiErrorBoundary>
  );
};
