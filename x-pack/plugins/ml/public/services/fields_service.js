/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out queries to obtain data
// specific to fields in Elasticsearch indices.

export function FieldsServiceProvider(es, ml) {

  // Obtains the cardinality of one or more fields.
  // Returns an Object whose keys are the names of the fields,
  // with values equal to the cardinality of the field.
  function getCardinalityOfFields(
    index,
    types,
    fieldNames,
    query,
    timeFieldName,
    earliestMs,
    latestMs) {

    return ml.getCardinalityOfFields({
      index,
      types,
      fieldNames,
      query,
      timeFieldName,
      earliestMs,
      latestMs
    });
  }

  // Returns the range of the specified time field.
  // Returns an Object containing start and end properties,
  // holding the value as an epoch (ms since the Unix epoch)
  // and as a formatted string.
  function getTimeFieldRange(
    index,
    timeFieldName,
    query) {

    return ml.getTimeFieldRange({
      index,
      timeFieldName,
      query
    });
  }

  return {
    getCardinalityOfFields,
    getTimeFieldRange
  };
}
