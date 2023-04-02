/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getGroupByTerms = (groupBy: string[] | string | undefined) => {
  return (groupBy ? [groupBy] : []).flat().map((group) => {
    return {
      field: group,
      missing: group.replaceAll('.', '_').toUpperCase().concat('_NOT_DEFINED'),
    };
  });
};
