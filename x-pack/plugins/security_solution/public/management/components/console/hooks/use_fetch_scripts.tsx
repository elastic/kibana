/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';

export const useFetchScripts = (agentId: string) => {
  const { http } = useKibana().services;
  const [data, setData] = useState(null);

  console.log({ http });
  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const response = await http.get('/api/endpoint/scripts', {
          // body: JSON.stringify({
          //   endpoint: [agentId],
          // }),
          version: '2023-10-31',
        });
        console.log({ response });
        setData(response.data.resources);
      } catch (error) {
        console.log({ error });
        // handle error
      }
    };

    fetchScripts();
  }, [http, agentId]);

  return data;
};
