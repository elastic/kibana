/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { IpToHostResponse } from '../../../common/http_api/ip_to_hostname';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export const useHostIpToName = (ipAddress: string | null, indexPattern: string | null) => {
  const fetch = useKibana().services.http?.fetch;
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoadingState] = useState<boolean>(true);
  const [data, setData] = useState<IpToHostResponse | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingState(true);
      setError(null);
      try {
        if (!fetch) {
          throw new Error('HTTP service is unavailable');
        }
        if (ipAddress && indexPattern) {
          const response = await fetch('/api/infra/ip_to_host', {
            method: 'POST',
            body: JSON.stringify({
              ip: ipAddress,
              index_pattern: indexPattern,
            }),
          });
          setLoadingState(false);
          setData(response);
        }
      } catch (err) {
        setLoadingState(false);
        setError(err);
      }
    })();
  }, [ipAddress, indexPattern, fetch]);
  return { name: (data && data.host) || null, loading, error };
};
