/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDocsCountPercent = ({
  docsCount,
  locales,
  patternDocsCount,
}: {
  docsCount: number;
  locales?: string | string[];
  patternDocsCount: number;
}): string =>
  patternDocsCount !== 0
    ? Number(docsCount / patternDocsCount).toLocaleString(locales, {
        style: 'percent',
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : '';
