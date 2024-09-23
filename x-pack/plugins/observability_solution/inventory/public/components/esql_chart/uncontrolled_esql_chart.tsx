/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { ControlledEsqlChart } from './controlled_esql_chart';

export function UncontrolledEsqlChart<T extends string>({
  id,
  query,
  metricNames,
  height,
  start,
  end,
}: {
  id: string;
  query: string;
  metricNames: T[];
  height: number;
  start: number;
  end: number;
}) {
  const result = useEsqlQueryResult({ query, start, end, operationName: 'visualize' });

  return <ControlledEsqlChart metricNames={metricNames} height={height} id={id} result={result} />;
}
