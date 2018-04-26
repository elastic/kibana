/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out queries to obtain data
// specific to fields in Elasticsearch indices.

export function fieldsServiceProvider(callWithRequest) {
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

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range and the datafeed config query.
    const mustCriteria = [
      {
        range: {
          [timeFieldName]: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis'
          }
        }
      }
    ];

    if (types && types.length) {
      mustCriteria.push({ terms: { _type: types } });
    }

    if (query) {
      mustCriteria.push(query);
    }

    const aggs = fieldNames.reduce((obj, field) => {
      obj[field] = { cardinality: { field } };
      return obj;
    }, {});

    const body = {
      query: {
        bool: {
          must: mustCriteria
        }
      },
      size: 0,
      _source: {
        excludes: []
      },
      aggs
    };

    return new Promise((resolve, reject) => {
      callWithRequest('search', {
        index,
        body
      })
        .then((resp) => {
          const aggregations = resp.aggregations;
          const results = fieldNames.reduce((obj, field) => {
            obj[field] = (aggregations[field] || { value: 0 }).value;
            return obj;
          }, {});
          resolve(results);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  function getTimeFieldRange(
    index,
    timeFieldName,
    query) {
    return new Promise((resolve, reject) => {
      const obj = { success: true, start: { epoch: 0, string: '' }, end: { epoch: 0, string: '' } };

      callWithRequest('search', {
        index,
        size: 0,
        body: {
          query,
          aggs: {
            earliest: {
              min: {
                field: timeFieldName
              }
            },
            latest: {
              max: {
                field: timeFieldName
              }
            }
          }
        }
      })
        .then((resp) => {
          if (resp.aggregations && resp.aggregations.earliest && resp.aggregations.latest) {
            obj.start.epoch = resp.aggregations.earliest.value;
            obj.start.string = resp.aggregations.earliest.value_as_string;

            obj.end.epoch = resp.aggregations.latest.value;
            obj.end.string = resp.aggregations.latest.value_as_string;
          }
          resolve(obj);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  return {
    getCardinalityOfFields,
    getTimeFieldRange
  };
}
