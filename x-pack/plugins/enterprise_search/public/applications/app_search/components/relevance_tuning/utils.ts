/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, omit } from 'lodash';

import { NUMBER } from '../../../shared/constants/field_types';
import { SchemaTypes } from '../../../shared/types';

import { RawBoost, Boost, SearchSettings, BoostType } from './types';

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

const toArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);
const toString = <T>(v1: T) => String(v1);

const normalizeBoostValue = (boost: RawBoost): Boost => {
  if (!boost.hasOwnProperty('value')) {
    // Can't simply do `return boost` here as TS can't infer the correct type
    return omit(boost, 'value');
  }

  return {
    ...boost,
    type: boost.type as BoostType,
    value: toArray(boost.value).map(toString),
  };
};

// Data may have been set to invalid types directly via the public App Search API. Since these are invalid, we don't want to deal
// with them as valid types in the UI. For that reason, we stringify all values here, as the data comes in.
// Additionally, values can be in single values or in arrays.
export const normalizeBoostValues = (boosts: Record<string, RawBoost[]>): Record<string, Boost[]> =>
  Object.entries(boosts).reduce((newBoosts, [fieldName, boostList]) => {
    return {
      ...newBoosts,
      [fieldName]: boostList.map(normalizeBoostValue),
    };
  }, {});
