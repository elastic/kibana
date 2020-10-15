/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { overviewFiltersSelector } from '../../../../state/selectors';
import { useFilterUpdate } from '../../../../hooks/use_filter_update';

export interface FilterExpressionsSelectProps {
  alertParams: { [key: string]: any };
  newFilters: string[];
  onRemoveFilter: (val: string) => void;
  setAlertParams: (key: string, value: any) => void;
  shouldUpdateUrl: boolean;
}

export const FiltersExpressionSelectContainer: React.FC<FilterExpressionsSelectProps> = (props) => {
  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
  }>({ fieldName: '', values: [] });

  useFilterUpdate(updatedFieldValues.fieldName, updatedFieldValues.values, props.shouldUpdateUrl);

  const overviewFilters = useSelector(overviewFiltersSelector);

  return (
    <FiltersExpressionsSelect
      {...overviewFilters}
      {...props}
      setUpdatedFieldValues={setUpdatedFieldValues}
    />
  );
};
