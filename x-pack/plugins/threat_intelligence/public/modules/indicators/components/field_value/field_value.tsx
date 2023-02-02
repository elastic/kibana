/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { useFieldTypes } from '../../../../hooks';
import { EMPTY_VALUE } from '../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { DateFormatter } from '../../../../components/date_formatter';
import { unwrapValue } from '../../utils';
import { TLPBadge } from '../tlp_badge';

export interface IndicatorFieldValueProps {
  /**
   * Indicator to display the field value from (see {@link Indicator}).
   */
  indicator: Indicator;
  /**
   * The field to get the indicator's value for.
   */
  field: string;
}

/**
 * Takes an indicator object, a field and a field => type object to returns the correct value to display.
 * @returns If the type is a 'date', returns the {@link DateFormatter} component, else returns the value or {@link EMPTY_VALUE}.
 */
export const IndicatorFieldValue: VFC<IndicatorFieldValueProps> = ({ indicator, field }) => {
  const fieldType = useFieldTypes()[field];
  const value = unwrapValue(indicator, field as RawIndicatorFieldId);

  if (field === RawIndicatorFieldId.MarkingTLP) {
    return <TLPBadge value={value} />;
  }

  return fieldType === 'date' ? (
    <DateFormatter date={value as string} />
  ) : value ? (
    <>{value}</>
  ) : (
    <>{EMPTY_VALUE}</>
  );
};
