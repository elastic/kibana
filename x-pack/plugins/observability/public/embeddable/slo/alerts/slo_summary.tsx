/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';

import { EmbeddableSloProps } from './types';

export function SloSummary({ slos, lastReloadRequestTime }: EmbeddableSloProps) {
  // const { data: activeAlerts } = useFetchActiveAlerts({
  //   sloIdsAndInstanceIds: [
  //     // ['2f3f52a0-7b60-11ee-8f2d-95d71754a584', '*'],
  //     // ['4776bb30-7bb3-11ee-8f2d-95d71754a584', '*'],
  //     ['9270f550-7b5f-11ee-8f2d-95d71754a584', '*'],
  //   ],
  // });
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slos.map(Object.values),
  });
  console.log(activeAlerts, '!!activeAlerts');
  console.log(slos.map(Object.values));
  const y = slos.map(Object.values);
  // useEffect(() => {
  //   refetch();
  // }, [lastReloadRequestTime, refetch]);
  let numOfAlerts = 0;
  slos.forEach((slo) => {
    if (activeAlerts.get(slo)) {
      numOfAlerts = numOfAlerts + activeAlerts.get(slo);
    }
  });
  return <h1>{numOfAlerts}</h1>;
}
