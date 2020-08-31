/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Merge rollup capabilities information with field information

export interface Field {
  name?: string;
  [key: string]: any;
}

export const mergeCapabilitiesWithFields = (
  rollupIndexCapabilities: { [key: string]: any },
  fieldsFromFieldCapsApi: { [key: string]: any },
  previousFields: Field[] = []
) => {
  const rollupFields = [...previousFields];
  const rollupFieldNames: string[] = [];

  Object.keys(rollupIndexCapabilities).forEach((agg) => {
    // Field names of the aggregation
    const fields = Object.keys(rollupIndexCapabilities[agg]);

    // Default field information
    const defaultField = {
      name: null,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    };

    // Date histogram agg only ever has one field defined, let date type overwrite a
    // previous type if defined (such as number from max and min aggs).
    if (agg === 'date_histogram') {
      const timeFieldName = fields[0];
      const fieldCapsKey = `${timeFieldName}.${agg}.timestamp`;
      const newField = {
        ...fieldsFromFieldCapsApi[fieldCapsKey],
        ...defaultField,
        name: timeFieldName,
      };
      const existingField = rollupFields.find((field) => field.name === timeFieldName);

      if (existingField) {
        Object.assign(existingField, newField);
      } else {
        rollupFieldNames.push(timeFieldName);
        rollupFields.push(newField);
      }
    }
    // For all other aggs, filter out ones that have already been added to the field list
    // because the same field can be part of multiple aggregations, but end consumption
    // doesn't differentiate fields based on their aggregation abilities.
    else {
      rollupFields.push(
        ...fields
          .filter((field) => !rollupFieldNames.includes(field))
          .map((field) => {
            // Expand each field into object format that end consumption expects.
            const fieldCapsKey = `${field}.${agg}.value`;
            rollupFieldNames.push(field);
            return {
              ...fieldsFromFieldCapsApi[fieldCapsKey],
              ...defaultField,
              name: field,
            };
          })
      );
    }
  });

  return rollupFields;
};
