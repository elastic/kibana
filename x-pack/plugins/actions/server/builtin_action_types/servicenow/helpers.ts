/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SUPPORTED_SOURCE_FIELDS } from './constants';
import { MapsType, FinalMapping } from './types';

export const normalizeMapping = (fields: string[], mapping: MapsType[]): MapsType[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    m => m.source !== '__proto__' && m.target !== '__proto__' && fields.includes(m.source)
  );
};

export const buildMap = (mapping: MapsType[]): FinalMapping => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, onEditAndUpdate } = field;
    fieldsMap.set(source, { target, onEditAndUpdate });
    fieldsMap.set(target, { target: source, onEditAndUpdate });
    return fieldsMap;
  }, new Map());
};

interface KeyAny {
  [key: string]: unknown;
}

export const mapParams = (params: any, mapping: FinalMapping) => {
  return Object.keys(params).reduce((prev: KeyAny, curr: string): KeyAny => {
    const field = mapping.get(curr);
    if (field) {
      prev[field.target] = params[curr];
    }
    return prev;
  }, {});
};
