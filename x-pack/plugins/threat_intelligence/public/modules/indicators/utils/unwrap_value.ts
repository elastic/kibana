/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type IndicatorLike = Record<'fields', Record<string, unknown>> | null | undefined;

/**
 * Unpacks field value from raw indicator fields. Will return null if fields are missing entirely
 * or there is no record for given `fieldId`
 */
export const unwrapValue = <T = string>(indicator: IndicatorLike, fieldId: string): T | null => {
  if (!indicator) {
    return null;
  }

  const fieldValues = indicator.fields?.[fieldId];

  if (!Array.isArray(fieldValues)) {
    return null;
  }

  const firstValue = fieldValues[0];

  return typeof firstValue === 'object' ? null : (firstValue as T);
};
