/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const QUERY_SIZE = 10;

export const buildEntityStoreQuery = ({
  defaultIndex,
  params,
}: {
  defaultIndex: string;
  params: any;
}) => {
  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      ...params.query,
    },
  };

  return dslQuery;
};
