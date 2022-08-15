/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { DateFormatter } from '../../../../components/date_formatter';
import { unwrapValue } from '../../lib/unwrap_value';

export interface IndicatorFieldProps {
  indicator: Indicator;
  field: string;
  fieldTypesMap: { [id: string]: string };
}

/**
 * Takes an indicator object, a field and a field => type object to returns the correct value to display
 * @param indicator see {@link Indicator}
 * @param field the field to get the indicator's value for
 * @param fieldTypesMap an object to know what type ('file', 'date', ...) the field is
 * @returns If the type is a 'date', returns the {@link DateFormatter} component, else returns the value or {@link EMPTY_VALUE}
 */
export const IndicatorField: VFC<IndicatorFieldProps> = ({ indicator, field, fieldTypesMap }) => {
  const value = unwrapValue(indicator, field as RawIndicatorFieldId);
  const fieldType = fieldTypesMap[field];
  return fieldType === 'date' ? (
    <DateFormatter date={value as string} />
  ) : value ? (
    <>{value}</>
  ) : (
    <>{EMPTY_VALUE}</>
  );
};
