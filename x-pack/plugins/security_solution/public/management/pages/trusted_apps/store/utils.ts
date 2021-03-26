/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseQueryFilterToKQL = (filter: string): string => {
  if (!filter) return '';
  const kuery = [
    `exception-list-agnostic.attributes.name:\"${filter}\"`,
    `exception-list-agnostic.attributes.description:\"${filter}\"`,
    `exception-list-agnostic.attributes.entries.value:\"${filter}\"`,
    `exception-list-agnostic.attributes.entries.entries.value:\"${filter}\"`,
  ].join(' OR ');

  return kuery;
};
