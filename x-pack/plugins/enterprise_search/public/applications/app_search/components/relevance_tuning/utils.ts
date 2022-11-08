/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, omit } from 'lodash';

import { SchemaType } from '../../../shared/schema/types';

import { RawBoost, Boost, SearchSettings, BoostType, ValueBoost } from './types';

// If the user hasn't entered a filter, then we can skip filtering the array entirely
export const filterIfTerm = (array: string[], filterTerm: string): string[] => {
  return filterTerm === '' ? array : array.filter((item) => item.includes(filterTerm));
};

export const removeBoostStateProps = (searchSettings: SearchSettings): SearchSettings => {
  const updatedSettings = cloneDeep(searchSettings);
  const { boosts } = updatedSettings;
  const keys = Object.keys(boosts);
  keys.forEach((key) => boosts[key].forEach((boost) => delete boost.newBoost));

  return updatedSettings;
};

export const parseBoostCenter = (fieldType: SchemaType, value: string | number) => {
  // Leave non-numeric fields alone
  if (fieldType === SchemaType.Number) {
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

// Our model allows for empty values to be added to boosts. However, the server will not accept
// empty strings in values. To avoid that, we filter out empty values before sending them to the server.

// I.e., the server will not accept any of the following, so we need to filter them out
// value: undefined
// value: []
// value: ['']
// value: ['foo', '']
export const removeEmptyValueBoosts = (
  boosts: Record<string, Boost[]>
): Record<string, Boost[]> => {
  // before:
  //   { foo: { values: ['a', '', '   '] } }
  //   { foo: { values: [''] } }
  // after:
  //   { foo: { values: ['a'] } }
  const filterEmptyValueBoosts = (fieldBoosts: Boost[]) => {
    return fieldBoosts.filter((boost: Boost) => {
      if (boost.type !== BoostType.Value) return true;

      const valueBoost = boost as ValueBoost;
      const filteredValues = valueBoost.value.filter((value) => value.trim() !== '');

      if (filteredValues.length) {
        boost.value = filteredValues;
        return true;
      } else {
        return false;
      }
    });
  };

  return Object.entries(boosts).reduce((acc, [fieldName, fieldBoosts]) => {
    const updatedBoosts = filterEmptyValueBoosts(fieldBoosts);
    return updatedBoosts.length ? { ...acc, [fieldName]: updatedBoosts } : acc;
  }, {});
};
