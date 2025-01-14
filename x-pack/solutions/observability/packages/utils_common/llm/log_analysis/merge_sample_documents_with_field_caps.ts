/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, sortBy, uniq } from 'lodash';
import type { DocumentAnalysis } from './document_analysis';

export function mergeSampleDocumentsWithFieldCaps({
  total,
  samples,
  fieldCaps,
}: {
  total: number;
  samples: Array<Record<string, unknown | unknown[]>>;
  fieldCaps: Array<{ name: string; esTypes?: string[] }>;
}): DocumentAnalysis {
  const nonEmptyFields = new Set<string>();
  const fieldValues = new Map<string, Array<string | number | boolean>>();

  for (const document of samples) {
    Object.keys(document).forEach((field) => {
      if (!nonEmptyFields.has(field)) {
        nonEmptyFields.add(field);
      }

      const values = castArray(document[field]);

      const currentFieldValues = fieldValues.get(field) ?? [];

      values.forEach((value) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          currentFieldValues.push(value);
        }
      });

      fieldValues.set(field, currentFieldValues);
    });
  }

  const fields = fieldCaps.flatMap((spec) => {
    const values = fieldValues.get(spec.name);

    const countByValues = new Map<string | number | boolean, number>();

    values?.forEach((value) => {
      const currentCount = countByValues.get(value) ?? 0;
      countByValues.set(value, currentCount + 1);
    });

    const sortedValues = sortBy(
      Array.from(countByValues.entries()).map(([value, count]) => {
        return {
          value,
          count,
        };
      }),
      'count',
      'desc'
    );

    return {
      name: spec.name,
      types: spec.esTypes ?? [],
      empty: !nonEmptyFields.has(spec.name),
      cardinality: countByValues.size || null,
      values: uniq(sortedValues.flatMap(({ value }) => value)),
    };
  });

  return {
    total,
    sampled: samples.length,
    fields,
  };
}
