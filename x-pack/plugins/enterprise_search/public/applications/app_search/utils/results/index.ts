/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function isFieldValueWrapper(object: [key: string]) {
  return (
    object &&
    (Object.prototype.hasOwnProperty.call(object, "raw") ||
     Object.prototype.hasOwnProperty.call(object, "snippet"))
  );
}

// Returns true for objects like this:
// objectField: {
//     objectSubField1: { raw: "one" },
//     objectSubField2: { raw: "two" }
// }
// And false for objects like this:
// objectField: { raw: "one" }
function isNestedField(result: any, field: string) {
  return (
    result &&
    result[field] &&
    field !== "_meta" &&
    typeof result[field] === "object" &&
    !isFieldValueWrapper(result[field])
  );
}

// Takes any value and removes the wrapper around deepest values
// (removes the wrapper Object with "raw" and/or "snippet" fields)
// See tests for examples
function cleanValueWrappers(value: any): object {
  if (isFieldValueWrapper(value) && value.raw) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cleanValueWrappers);
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((acc: any, [key, value]) => {
      acc[key] = cleanValueWrappers(value);
      return acc;
    }, {});
  }

  return value;
}


export function formatResult(result: any): object {
  return Object.keys(result).reduce((acc: any, field) => {
    if (isNestedField(result, field)) {
      return {
        ...acc,
        [field]: { raw: cleanValueWrappers(result[field]) }
      };
    }

    return { ...acc, [field]: result[field] };
  }, {});
}
