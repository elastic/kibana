/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { overviewFiltersSelector } from '../../../../state/selectors';

export interface FilterExpressionsSelectProps {
  alertParams: { [key: string]: any };
  newFilters: string[];
  onRemoveFilter: (val: string) => void;
  setAlertParams: (key: string, value: any) => void;
  shouldUpdateUrl: boolean;
}

export const FiltersExpressionSelectContainer: React.FC<FilterExpressionsSelectProps> = (props) => {
  const overviewFilters = useSelector(overviewFiltersSelector);

  return <FiltersExpressionsSelect {...overviewFilters} {...props} />;
};
