/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useFetcher } from '../../../../../../observability/public';

interface Props {
  stopPolling: boolean;
}
export const useScriptReorder = ({ stopPolling }: Props) => {
  const [refresh, setRefresh] = useState(Date.now());

  useEffect(() => {
    let tickTick;
    if (!stopPolling) {
      tickTick = setInterval(() => {
        setRefresh(Date.now());
      }, 10 * 1000);
    } else {
      if (tickTick) clearInterval(tickTick);
    }

    return () => {
      if (tickTick) clearInterval(tickTick);
    };
  }, [stopPolling]);

  const { data } = useFetcher(async () => {
    const res = await fetch('http://localhost:8230/');
    return res.text();
  }, [refresh]);
  console.log(data);

  return data;
};
