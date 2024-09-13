/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_VALUE } from '../../../constants/common';
import { unwrapValue } from './unwrap_value';
import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';

/**
 * Retrieves a field/value pair from an Indicator
 * @param data the {@link Indicator} to extract the value for the field
 * @param field the Indicator's field
 * @returns the key/value pair (indicator's field/value)
 */
export const getIndicatorFieldAndValue = (
  data: Indicator,
  field: string
): { key: string; value: string | null } => {
  const value = unwrapValue(data, field as RawIndicatorFieldId);
  const key =
    field === RawIndicatorFieldId.Name
      ? (unwrapValue(data, RawIndicatorFieldId.NameOrigin) as string)
      : field;

  return {
    key,
    value,
  };
};

/**
 * Checks if field and value are correct
 * @param field Indicator string field
 * @param value Indicator string|null value for the field
 * @returns true if correct, false if not
 */
export const fieldAndValueValid = (field: string | null, value: string | null): boolean =>
  !!value && value !== EMPTY_VALUE && !!field;
