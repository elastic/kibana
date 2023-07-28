/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toTimestampRange = ({ from, to }: { from: string; to: string }) => {
  const fromTs = new Date(from).getTime();
  const toTs = new Date(to).getTime();

  return { from: fromTs, to: toTs };
};
