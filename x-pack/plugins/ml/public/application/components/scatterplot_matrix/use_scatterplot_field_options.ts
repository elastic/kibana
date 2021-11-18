/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { DataView } from '../../../../../../../src/plugins/data_views/public';

import { ML__INCREMENTAL_ID } from '../../data_frame_analytics/common/fields';

export const useScatterplotFieldOptions = (
  indexPattern?: DataView,
  includes?: string[],
  excludes?: string[],
  resultsField = ''
): string[] => {
  return useMemo(() => {
    const fields: string[] = [];

    if (indexPattern === undefined || includes === undefined) {
      return fields;
    }

    if (includes.length > 1) {
      fields.push(
        ...includes.filter((d) =>
          indexPattern.fields.some((f) => f.name === d && f.type === 'number')
        )
      );
    } else {
      fields.push(
        ...indexPattern.fields
          .filter(
            (f) =>
              f.type === 'number' &&
              !indexPattern.metaFields.includes(f.name) &&
              !f.name.startsWith(`${resultsField}.`) &&
              f.name !== ML__INCREMENTAL_ID
          )
          .map((f) => f.name)
      );
    }

    return Array.isArray(excludes) && excludes.length > 0
      ? fields.filter((f) => !excludes.includes(f))
      : fields;
  }, [indexPattern, includes, excludes]);
};
