/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This method flattens fields in documents returned from the ent-search backend.
 * If a field in the document contains "raw" key, it's already flat.
 * If it doesn't, we want to pull properties from it, and move them to the top level.
 * This field is already flat:
 * 'country', { raw: 'United States' }
 * This field is not flat:
 * 'address', {
 *     country: { raw: 'United States' },
 *     city: { raw: 'Los Angeles' }
 * }
 * It will be transformed into:
 * [
 *   ['address.country', { raw: 'United States' }],
 *   ['address.city', { raw: 'Los Angeles' }]
 * ]
 */
export const flattenDocumentField = (
  fieldName: string,
  fieldValue: object
): Array<[string, object]> => {
  const flattened: Array<[string, object]> = [];

  if (typeof fieldValue === 'object' && !fieldValue.hasOwnProperty('raw')) {
    for (const [propName, value] of Object.entries(fieldValue)) {
      flattenDocumentField(fieldName + '.' + propName, value).map(([flatKey, flatVal]) => {
        flattened.push([flatKey, flatVal]);
      });
    }
  } else {
    flattened.push([fieldName, fieldValue]);
  }

  return flattened;
};

export const cleanNestedValue = (value: { raw?: object }): any => {
  if (Array.isArray(value)) {
    return value.map(cleanNestedValue);
  }

  if (!!value.raw) {
    return value.raw
  }

  if (typeof(value) == 'string' || typeof(value) == 'number') {
    return value;
  }

  return Object.entries(value).reduce((acc: { [key: string] : any } , [key, value]) => {
    acc[key] = cleanNestedValue(value);
    return acc;
  }, {});
}

/* This method flattens documents returned from the ent-search backend.
 * Example document:
 * {
 *   id: { raw: '123' },
 *   _meta: { engine: 'Test', id: '1' },
 *   title: { raw: 'Getty Museum' },
 *   address: { city: { raw: 'Los Angeles' }, state: { raw: 'California' } },
 * }
 * Will be transformed to:
 * {
 *   id: { raw: '123' },
 *   _meta: { engine: 'Test', id: '1' },
 *   title: { raw: 'Getty Museum' },
 *   'address.city': { raw: 'Los Angeles' },
 *   'address.state': { raw: 'California' },
 * }
 */
export const flattenDocument = (result: object): object => {
  const flattened: { [index: string]: object } = {};

  for (const [key, value] of Object.entries(result)) {
    if (key === 'id' || key === '_meta') {
      flattened[key] = value;
    } else {
      if (!!value.raw || !!value.snippet) {
        flattened[key] = value;
      } else {
        flattened[key] = { raw: cleanNestedValue(value) }
      }
    }
  }
  console.log(flattened)

  return flattened;
};
