/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function isFieldValueWrapper(object: object): boolean {
  return object && (object.hasOwnProperty('raw') || object.hasOwnProperty('snippet'));
}

// Returns true for objects like this:
// objectField: {
//     objectSubField1: { raw: "one" },
//     objectSubField2: { raw: "two" }
// }
// And false for objects like this:
// objectField: { raw: "one" }
function isNestedFieldValue(fiedlValue: object | object[]): boolean {
  if (Array.isArray(fiedlValue)) {
    fiedlValue.map(isNestedFieldValue).reduce((acc, current) => acc || current, false);
  }

  return typeof fiedlValue === "object" && !isFieldValueWrapper(fiedlValue);
}

// Takes any value and removes the wrapper around deepest values
// (removes the wrapper Object with "raw" and/or "snippet" fields)
// See tests for examples
function cleanValueWrappers(value: object | object[]) : object {
  if (Array.isArray(value)) {
    return value.map(cleanValueWrappers);
  }

  if (isFieldValueWrapper(value)) {
    return (value as { raw: object }).raw;
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, currentValue]) => {
      return { ...acc, [key]: cleanValueWrappers(currentValue) };
    }, {});
  }

  return value;
}

export function formatResult(result: object): object {
  return Object.entries(result).reduce((acc, [fieldName, fieldValue]) => {
    if (fieldName !== '_meta' && isNestedFieldValue(fieldValue)) {
      return {
        ...acc,
        [fieldName]: { raw: cleanValueWrappers(fieldValue) }
      };
    }

    return { ...acc, [fieldName]: fieldValue };
  }, {});
}
