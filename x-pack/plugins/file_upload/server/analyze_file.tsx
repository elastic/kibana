/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type {
  AnalysisResult,
  FormattedOverrides,
  InputData,
  InputOverrides,
} from '../common/types';

export async function analyzeFile(
  client: IScopedClusterClient,
  data: InputData,
  overrides: InputOverrides
): Promise<AnalysisResult> {
  overrides.explain = overrides.explain === undefined ? 'true' : overrides.explain;
  const body = await client.asInternalUser.textStructure.findStructure(
    {
      body: data,
      ...overrides,
    },
    { maxRetries: 0 }
  );

  const { hasOverrides, reducedOverrides } = formatOverrides(overrides);

  return {
    ...(hasOverrides && { overrides: reducedOverrides }),
    // @ts-expect-error type incompatible with FindFileStructureResponse
    results: body,
  };
}

function formatOverrides(overrides: InputOverrides) {
  let hasOverrides = false;

  const reducedOverrides: FormattedOverrides = Object.keys(overrides).reduce((acc, overrideKey) => {
    const overrideValue: string | undefined = overrides[overrideKey];
    if (overrideValue !== undefined && overrideValue !== '') {
      if (overrideKey === 'column_names') {
        acc.column_names = overrideValue.split(',');
      } else if (overrideKey === 'has_header_row') {
        acc.has_header_row = overrideValue === 'true';
      } else if (overrideKey === 'should_trim_fields') {
        acc.should_trim_fields = overrideValue === 'true';
      } else {
        acc[overrideKey] = overrideValue;
      }

      hasOverrides = true;
    }
    return acc;
  }, {} as FormattedOverrides);

  return {
    reducedOverrides,
    hasOverrides,
  };
}
