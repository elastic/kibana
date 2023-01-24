/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';

/**
 * Unpacks field value from raw indicator fields. Will return null if fields are missing entirely
 * or there is no record for given `fieldId`
 */
export const unwrapValue = <T = string>(
  indicator: Partial<Indicator> | null | undefined,
  fieldId: RawIndicatorFieldId
): T | null => {
  if (!indicator) {
    return null;
  }

  const valueArray = indicator.fields?.[fieldId];
  return Array.isArray(valueArray) ? (valueArray[0] as T) : null;
};
