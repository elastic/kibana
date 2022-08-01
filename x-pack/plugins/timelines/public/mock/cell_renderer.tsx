/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isArray, isString } from 'lodash';

import { getMappedNonEcsValue } from '../components/t_grid/body/data_driven_columns';
import type { CellValueElementProps } from '../../common/types/timeline';

const isArrayOfStrings = (subj: unknown): subj is string[] => isArray(subj) && subj.every(isString);

export const TestCellRenderer: React.FC<CellValueElementProps> = ({ columnId, data }) => {
  const value = getMappedNonEcsValue({ data, fieldName: columnId });
  return <>{(isArrayOfStrings(value) && value[0]) ?? ''}</>;
};
