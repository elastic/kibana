/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

function getParsedDate(rawDate?: string, options = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, options);
    if (parsed && parsed.isValid()) {
      return parsed.toDate();
    }
  }
}

function getRanges({ from, to }: { from: string; to: string }) {
  const start = getParsedDate(from);
  const end = getParsedDate(to, { roundUp: true });

  if (!start || !end) {
    throw new Error(`Invalid Dates: from: ${from}, to: ${to}`);
  }

  const startDate = start.toISOString();
  const endDate = end.toISOString();

  return {
    startDate,
    endDate,
  };
}

export function getDateRange({ from, to }: { from: string; to: string }) {
  const { startDate, endDate } = getRanges({ from, to });

  return {
    startDate: new Date(startDate).getTime(),
    endDate: new Date(endDate).getTime(),
  };
}

export function getDateISORange({ from, to }: { from: string; to: string }) {
  const { startDate, endDate } = getRanges({ from, to });

  return {
    startDate,
    endDate,
  };
}
