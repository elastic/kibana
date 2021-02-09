/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import { NUMBER } from '../../../shared/constants/field_types';
import { SchemaTypes } from '../../../shared/types';

import { SearchSettings } from './types';

// If the user hasn't entered a filter, then we can skip filtering the array entirely
export const filterIfTerm = (array: string[], filterTerm: string): string[] => {
  return filterTerm === '' ? array : array.filter((item) => item.includes(filterTerm));
};

export const removeBoostStateProps = (searchSettings: SearchSettings) => {
  const updatedSettings = cloneDeep(searchSettings);
  const { boosts } = updatedSettings;
  const keys = Object.keys(boosts);
  keys.forEach((key) => boosts[key].forEach((boost) => delete boost.newBoost));

  return updatedSettings;
};

export const parseBoostCenter = (fieldType: SchemaTypes, value: string | number) => {
  // Leave non-numeric fields alone
  if (fieldType === NUMBER) {
    const floatValue = parseFloat(value as string);
    return isNaN(floatValue) ? value : floatValue;
  }
  return value;
};
