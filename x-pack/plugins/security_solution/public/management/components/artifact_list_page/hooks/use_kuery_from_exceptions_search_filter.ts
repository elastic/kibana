/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../../common/utils';
import { MaybeImmutable } from '../../../../../common/endpoint/types';

export const useKueryFromExceptionsSearchFilter = (
  filter: string | undefined,
  fields: MaybeImmutable<string[]>,
  policies: string | undefined
): string | undefined => {
  return useMemo<string | undefined>(() => {
    return parsePoliciesAndFilterToKql({
      kuery: parseQueryFilterToKQL(filter, fields),
      policies: policies ? policies.split(',') : [],
    });
  }, [fields, filter, policies]);
};
