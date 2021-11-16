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
    const tickTick = setInterval(() => {
      setRefresh(Date.now());
    }, 5 * 1000);

    return () => {
      if (tickTick) clearInterval(tickTick);
    };
  }, []);

  const { data } = useFetcher(async () => {
    const res = await fetch('http://localhost:8230/');
    return res.json();
  }, [refresh]);

  return data?.code;
};
